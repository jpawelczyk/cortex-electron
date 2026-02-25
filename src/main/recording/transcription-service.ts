import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import type { ChildProcess } from 'child_process';
import { unlink, readFile } from 'fs/promises';
import type { TranscriptSegment } from '@shared/recording-types';

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

export interface TranscriptionService {
  isAvailable(): Promise<{ whisper: boolean; ffmpeg: boolean }>;
  transcribe(
    audioPath: string,
    options?: { model?: string; onProgress?: (pct: number) => void },
  ): Promise<TranscriptionResult>;
  cancel(): void;
}

function execFilePromise(
  cmd: string,
  args: string[],
  onProcess?: (proc: ChildProcess) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, {}, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    onProcess?.(proc);
  });
}

function which(binary: string): Promise<string> {
  return execFilePromise('which', [binary]);
}

export function createTranscriptionService(): TranscriptionService {
  let currentProcess: ChildProcess | null = null;

  // Cache the resolved whisper binary name across calls
  let whisperBinCache: string | null = null;

  async function resolveWhisperBin(): Promise<string> {
    if (whisperBinCache) return whisperBinCache;
    try {
      await which('whisper-cpp');
      whisperBinCache = 'whisper-cpp';
    } catch {
      await which('whisper'); // throws if not found
      whisperBinCache = 'whisper';
    }
    return whisperBinCache;
  }

  async function isAvailable(): Promise<{ whisper: boolean; ffmpeg: boolean }> {
    const [whisper, ffmpeg] = await Promise.all([
      resolveWhisperBin().then(
        () => true,
        () => false,
      ),
      which('ffmpeg').then(
        () => true,
        () => false,
      ),
    ]);
    return { whisper, ffmpeg };
  }

  function runExecFile(cmd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = execFile(cmd, args, {}, (err, stdout) => {
        currentProcess = null;
        if (err) reject(err);
        else resolve(stdout);
      });
      currentProcess = proc;
    });
  }

  async function transcribe(
    audioPath: string,
    options: { model?: string; onProgress?: (pct: number) => void } = {},
  ): Promise<TranscriptionResult> {
    const { model = 'base', onProgress } = options;

    const wavPath = path.join(
      os.tmpdir(),
      path.basename(audioPath, path.extname(audioPath)) + '_' + Date.now() + '.wav',
    );

    onProgress?.(0);

    try {
      // Step 1: convert WebM → WAV 16kHz mono
      await runExecFile('ffmpeg', [
        '-y',
        '-i', audioPath,
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        wavPath,
      ]);

      onProgress?.(50);

      // Step 2: run whisper (whisper-cpp and OpenAI whisper have different CLIs)
      const result = await runWhisper(wavPath, model);

      onProgress?.(100);

      return result;
    } finally {
      await unlink(wavPath).catch(() => {});
    }
  }

  async function runWhisper(wavPath: string, model: string): Promise<TranscriptionResult> {
    const bin = whisperBinCache ?? 'whisper-cpp';

    if (bin === 'whisper') {
      return runOpenAIWhisper(wavPath, model);
    }

    // Try whisper-cpp first
    try {
      const threads = Math.min(os.cpus().length, 8).toString();
      const stdout = await runExecFile('whisper-cpp', [
        '--model', model, '--language', 'auto', '--threads', threads, '--output-json', wavPath,
      ]);
      return parseWhisperCppOutput(stdout);
    } catch {
      // Fallback to OpenAI whisper
      whisperBinCache = 'whisper';
      return runOpenAIWhisper(wavPath, model);
    }
  }

  async function runOpenAIWhisper(wavPath: string, model: string): Promise<TranscriptionResult> {
    const outputDir = path.dirname(wavPath);
    await runExecFile('whisper', [
      wavPath, '--model', model, '--output_format', 'json', '--output_dir', outputDir,
    ]);

    // OpenAI whisper writes {input_basename}.json in the output dir
    const jsonPath = wavPath.replace(/\.wav$/, '.json');
    const jsonContent = await readFile(jsonPath, 'utf-8');
    await unlink(jsonPath).catch(() => {});

    return parseOpenAIWhisperOutput(jsonContent);
  }

  function parseWhisperCppOutput(raw: string): TranscriptionResult {
    const parsed = JSON.parse(raw) as {
      transcription: Array<{ offsets: { from: number; to: number }; text: string }>;
      result: { language: string };
    };

    const segments: TranscriptSegment[] = parsed.transcription.map((seg) => ({
      start: seg.offsets.from / 1000,
      end: seg.offsets.to / 1000,
      text: seg.text.trim(),
    }));

    const text = segments.map((s) => s.text).join(' ');
    const language = parsed.result?.language ?? 'unknown';

    return { text, segments, language };
  }

  function parseOpenAIWhisperOutput(raw: string): TranscriptionResult {
    const parsed = JSON.parse(raw) as {
      text: string;
      segments: Array<{ start: number; end: number; text: string }>;
      language: string;
    };

    const segments: TranscriptSegment[] = parsed.segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    }));

    const text = segments.map((s) => s.text).join(' ');
    const language = parsed.language ?? 'unknown';

    return { text, segments, language };
  }

  function cancel(): void {
    currentProcess?.kill();
  }

  return { isAvailable, transcribe, cancel };
}
