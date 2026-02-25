import path from 'path';
import { mkdir, rename, unlink, stat } from 'fs/promises';
import { net } from 'electron';
import type { WhisperModel, WhisperModelInfo } from '@shared/recording-types';

const MODEL_METADATA: Record<WhisperModel, { size: string; sizeBytes: number; description: string }> = {
  tiny:   { size: '75 MB',   sizeBytes: 78643200,    description: 'Fastest, lowest accuracy' },
  base:   { size: '142 MB',  sizeBytes: 148897792,   description: 'Good balance of speed and accuracy' },
  small:  { size: '466 MB',  sizeBytes: 488636416,   description: 'Better accuracy, slower' },
  medium: { size: '1.5 GB',  sizeBytes: 1533853696,  description: 'High accuracy, requires more RAM' },
  large:  { size: '2.9 GB',  sizeBytes: 3094623232,  description: 'Best accuracy, slowest' },
};

const MODEL_NAMES: WhisperModel[] = ['tiny', 'base', 'small', 'medium', 'large'];

export interface ModelManager {
  listModels(): Promise<WhisperModelInfo[]>;
  downloadModel(name: WhisperModel, onProgress?: (progress: number) => void): Promise<void>;
  deleteModel(name: WhisperModel): Promise<void>;
  cancelDownload(): void;
}

export function createModelManager(app: { getPath(name: string): string }): ModelManager {
  let currentAbortController: AbortController | null = null;

  function getModelsDir(): string {
    return path.join(app.getPath('userData'), 'whisper-models');
  }

  function getModelPath(name: WhisperModel): string {
    return path.join(getModelsDir(), `ggml-${name}.bin`);
  }

  async function ensureModelsDir(): Promise<void> {
    await mkdir(getModelsDir(), { recursive: true });
  }

  async function listModels(): Promise<WhisperModelInfo[]> {
    await ensureModelsDir();

    return Promise.all(
      MODEL_NAMES.map(async (name) => {
        const filePath = getModelPath(name);
        let downloaded = false;
        try {
          await stat(filePath);
          downloaded = true;
        } catch {
          downloaded = false;
        }

        const meta = MODEL_METADATA[name];
        return {
          name,
          size: meta.size,
          sizeBytes: meta.sizeBytes,
          description: meta.description,
          downloaded,
          downloading: false,
          downloadProgress: 0,
        };
      }),
    );
  }

  async function downloadModel(
    name: WhisperModel,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    await ensureModelsDir();

    const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${name}.bin`;
    const destPath = getModelPath(name);
    const partialPath = destPath + '.partial';

    const controller = new AbortController();
    currentAbortController = controller;

    try {
      const response = await net.fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      const { createWriteStream } = await import('fs');
      const writeStream = createWriteStream(partialPath);

      let downloadedBytes = 0;

      await new Promise<void>((resolve, reject) => {
        if (!response.body) {
          reject(new Error('No response body'));
          return;
        }

        const reader = response.body.getReader();

        function pump(): void {
          reader
            .read()
            .then(({ done, value }) => {
              if (controller.signal.aborted) {
                writeStream.destroy();
                reject(new Error('Download cancelled'));
                return;
              }

              if (done) {
                writeStream.end(() => resolve());
                return;
              }

              writeStream.write(value, (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                downloadedBytes += value.length;

                if (totalBytes > 0 && onProgress) {
                  onProgress(Math.round((downloadedBytes / totalBytes) * 100));
                }

                pump();
              });
            })
            .catch(reject);
        }

        pump();
      });

      await rename(partialPath, destPath);
    } catch (err) {
      await unlink(partialPath).catch(() => {});
      throw err;
    } finally {
      if (currentAbortController === controller) {
        currentAbortController = null;
      }
    }
  }

  async function deleteModel(name: WhisperModel): Promise<void> {
    const filePath = getModelPath(name);
    await unlink(filePath);
  }

  function cancelDownload(): void {
    currentAbortController?.abort();
  }

  return {
    listModels,
    downloadModel,
    deleteModel,
    cancelDownload,
  };
}
