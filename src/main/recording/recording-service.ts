import path from 'path';
import { mkdir, writeFile, unlink, rename } from 'fs/promises';
import { execFile } from 'child_process';
import { desktopCapturer } from 'electron';
import type { App } from 'electron';
import type { AudioSource } from '@shared/recording-types';

export interface RecordingService {
  getRecordingsDir(): string;
  getRecordingPath(meetingId: string): string;
  saveRecording(meetingId: string, buffer: Buffer): Promise<string>;
  deleteRecording(audioPath: string): Promise<void>;
  getAudioSources(): Promise<AudioSource[]>;
}

export function createRecordingService(app: App): RecordingService {
  function getRecordingsDir(): string {
    return path.join(app.getPath('userData'), 'recordings');
  }

  function getRecordingPath(meetingId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${meetingId}.webm`;
    return path.join(getRecordingsDir(), filename);
  }

  async function saveRecording(meetingId: string, buffer: Buffer): Promise<string> {
    const dir = getRecordingsDir();
    await mkdir(dir, { recursive: true });

    const filePath = getRecordingPath(meetingId);
    await writeFile(filePath, buffer);

    // Remux to fix WebM duration metadata. MediaRecorder doesn't write it,
    // so browsers report Infinity. ffmpeg -c copy rewrites the container
    // without re-encoding — nearly instant.
    await remuxWebm(filePath);

    return filePath;
  }

  async function remuxWebm(filePath: string): Promise<void> {
    const tmpPath = filePath + '.tmp.webm';
    try {
      await new Promise<void>((resolve, reject) => {
        execFile('ffmpeg', ['-i', filePath, '-c', 'copy', '-y', tmpPath], {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      await rename(tmpPath, filePath);
    } catch {
      // ffmpeg not available — keep the original file as-is
      await unlink(tmpPath).catch(() => {});
    }
  }

  async function deleteRecording(audioPath: string): Promise<void> {
    const recordingsDir = getRecordingsDir();
    const resolved = path.resolve(audioPath);
    const resolvedDir = path.resolve(recordingsDir);

    if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
      throw new Error('Path is outside recordings directory');
    }

    await unlink(audioPath);
  }

  async function getAudioSources(): Promise<AudioSource[]> {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.id.startsWith('screen:') ? 'screen' : 'window',
    }));
  }

  return {
    getRecordingsDir,
    getRecordingPath,
    saveRecording,
    deleteRecording,
    getAudioSources,
  };
}
