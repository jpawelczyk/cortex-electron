import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'child_process';

// Mock child_process before importing the module under test
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs/promises before importing the module under test
vi.mock('fs/promises', () => ({
  unlink: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

import * as childProcess from 'child_process';
import * as fs from 'fs/promises';
import { createTranscriptionService } from '../transcription-service';

function mockExecFileError(message: string) {
  vi.mocked(childProcess.execFile).mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      const cb = callback as (err: Error) => void;
      process.nextTick(() => cb(new Error(message)));
      return { kill: vi.fn() } as unknown as ChildProcess;
    },
  );
}

const OPENAI_WHISPER_JSON = JSON.stringify({
  text: ' Hello world How are you',
  segments: [
    { id: 0, start: 0.0, end: 2.0, text: ' Hello world' },
    { id: 1, start: 2.0, end: 5.0, text: ' How are you' },
  ],
  language: 'en',
});

const WHISPER_JSON_OUTPUT = JSON.stringify({
  transcription: [
    { offsets: { from: 0, to: 2000 }, text: ' Hello world' },
    { offsets: { from: 2000, to: 5000 }, text: ' How are you' },
  ],
  result: { language: 'en' },
});

describe('TranscriptionService', () => {
  let service: ReturnType<typeof createTranscriptionService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createTranscriptionService('/models');
  });

  describe('isAvailable', () => {
    it('returns true for whisper when which finds whisper-cpp', async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          const argArr = args as string[];
          // which whisper-cpp succeeds, which ffmpeg succeeds
          process.nextTick(() => cb(null, '/usr/local/bin/' + argArr[0], ''));
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      const result = await service.isAvailable();
      expect(result.whisper).toBe(true);
      expect(result.ffmpeg).toBe(true);
    });

    it('falls back to "whisper" when whisper-cpp not found', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: Error | null, stdout?: string) => void;
          const argArr = args as string[];
          callCount++;
          if (argArr[0] === 'whisper-cpp') {
            process.nextTick(() => cb(new Error('not found')));
          } else {
            process.nextTick(() => cb(null, '/usr/local/bin/' + argArr[0]));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      const result = await service.isAvailable();
      expect(result.whisper).toBe(true);
      expect(callCount).toBeGreaterThanOrEqual(2); // tried whisper-cpp, then whisper
    });

    it('returns false for whisper when neither whisper-cpp nor whisper found', async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: Error) => void;
          process.nextTick(() => cb(new Error('not found')));
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      const result = await service.isAvailable();
      expect(result.whisper).toBe(false);
    });

    it('returns false for ffmpeg when not found', async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: Error | null, stdout?: string) => void;
          const argArr = args as string[];
          if (argArr[0] === 'ffmpeg') {
            process.nextTick(() => cb(new Error('not found')));
          } else {
            process.nextTick(() => cb(null, '/usr/local/bin/' + argArr[0]));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      const result = await service.isAvailable();
      expect(result.ffmpeg).toBe(false);
    });
  });

  describe('transcribe', () => {
    beforeEach(() => {
      // Model file exists by default; individual tests override for ENOENT
      vi.mocked(fs.stat).mockResolvedValue({} as import('fs').Stats);
    });

    it('calls ffmpeg to convert webm to wav with correct flags', async () => {
      const calls: { cmd: string; args: string[] }[] = [];
      vi.mocked(childProcess.execFile).mockImplementation(
        (cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          calls.push({ cmd: cmd as string, args: args as string[] });
          // Second call (whisper) returns JSON
          if (calls.length === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await service.transcribe('/tmp/meeting.webm');

      const ffmpegCall = calls.find((c) => c.cmd === 'ffmpeg');
      expect(ffmpegCall).toBeDefined();
      expect(ffmpegCall!.args).toContain('-i');
      expect(ffmpegCall!.args).toContain('/tmp/meeting.webm');
      expect(ffmpegCall!.args).toContain('-ar');
      expect(ffmpegCall!.args).toContain('16000');
      expect(ffmpegCall!.args).toContain('-ac');
      expect(ffmpegCall!.args).toContain('1');
      expect(ffmpegCall!.args).toContain('-f');
      expect(ffmpegCall!.args).toContain('wav');
    });

    it('calls whisper-cpp with --output-json and resolved model file path', async () => {
      const calls: { cmd: string; args: string[] }[] = [];
      vi.mocked(childProcess.execFile).mockImplementation(
        (cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          calls.push({ cmd: cmd as string, args: args as string[] });
          if (calls.length === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await service.transcribe('/tmp/meeting.webm', { model: 'base' });

      const whisperCall = calls.find((c) => c.cmd === 'whisper-cpp' || c.cmd === 'whisper');
      expect(whisperCall).toBeDefined();
      expect(whisperCall!.args).toContain('--output-json');
      expect(whisperCall!.args).toContain('--model');
      // Should pass full file path, not bare model name
      expect(whisperCall!.args).toContain('/models/ggml-base.bin');
    });

    it('parses whisper JSON output into TranscriptSegments', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          callCount++;
          if (callCount === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toEqual({ start: 0, end: 2, text: 'Hello world' });
      expect(result.segments[1]).toEqual({ start: 2, end: 5, text: 'How are you' });
    });

    it('returns concatenated text from all segments', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          callCount++;
          if (callCount === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(result.text).toBe('Hello world How are you');
    });

    it('returns the detected language', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          callCount++;
          if (callCount === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(result.language).toBe('en');
    });

    it('cleans up the temp wav file after transcription', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          callCount++;
          if (callCount === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await service.transcribe('/tmp/meeting.webm');

      expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.wav$/));
    });

    it('cleans up the temp wav file even when transcription fails', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: Error | null, stdout?: string) => void;
          callCount++;
          if (callCount === 1) {
            process.nextTick(() => cb(null, ''));
          } else {
            process.nextTick(() => cb(new Error('whisper failed')));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await expect(service.transcribe('/tmp/meeting.webm')).rejects.toThrow('whisper failed');

      expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.wav$/));
    });

    it('reports progress via onProgress callback', async () => {
      let callCount = 0;
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          callCount++;
          if (callCount === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const progressValues: number[] = [];
      await service.transcribe('/tmp/meeting.webm', {
        onProgress: (pct) => progressValues.push(pct),
      });

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it('rejects when ffmpeg conversion fails', async () => {
      mockExecFileError('ffmpeg: command not found');
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await expect(service.transcribe('/tmp/meeting.webm')).rejects.toThrow(
        'ffmpeg: command not found',
      );
    });

    it('passes a timeout to execFile so it does not hang forever', async () => {
      const execFileOpts: Array<Record<string, unknown>> = [];
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          execFileOpts.push(opts as Record<string, unknown>);
          if (execFileOpts.length === 2) {
            process.nextTick(() => cb(null, WHISPER_JSON_OUTPUT, ''));
          } else {
            process.nextTick(() => cb(null, '', ''));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await service.transcribe('/tmp/meeting.webm');

      // Both ffmpeg and whisper calls should have a timeout
      expect(execFileOpts.length).toBeGreaterThanOrEqual(2);
      for (const opts of execFileOpts) {
        expect(opts.timeout).toBeGreaterThan(0);
      }
    });

    it('rejects with a clear error when model file is not found', async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          // ffmpeg succeeds
          process.nextTick(() => cb(null, '', ''));
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      await expect(service.transcribe('/tmp/meeting.webm', { model: 'large' })).rejects.toThrow(
        /model.*not.*downloaded/i,
      );
    });
  });

  describe('transcribe with OpenAI whisper', () => {
    beforeEach(async () => {
      // Resolve whisperBinCache to 'whisper' by making whisper-cpp unavailable
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: Error | null, stdout?: string) => void;
          const argArr = args as string[];
          if (argArr[0] === 'whisper-cpp') {
            process.nextTick(() => cb(new Error('not found')));
          } else {
            process.nextTick(() => cb(null, '/usr/local/bin/' + argArr[0]));
          }
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      await service.isAvailable();
      vi.clearAllMocks();
    });

    it('uses --output_format json and omits --language for OpenAI whisper', async () => {
      const calls: { cmd: string; args: string[] }[] = [];
      vi.mocked(childProcess.execFile).mockImplementation(
        (cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          calls.push({ cmd: cmd as string, args: args as string[] });
          process.nextTick(() => cb(null, '', ''));
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.readFile).mockResolvedValue(OPENAI_WHISPER_JSON);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await service.transcribe('/tmp/meeting.webm');

      const whisperCall = calls.find((c) => c.cmd === 'whisper');
      expect(whisperCall).toBeDefined();
      expect(whisperCall!.args).toContain('--output_format');
      expect(whisperCall!.args).toContain('json');
      expect(whisperCall!.args).toContain('--model');
      expect(whisperCall!.args).not.toContain('--output-json');
      expect(whisperCall!.args).not.toContain('--language');
    });

    it('reads and parses the output JSON file', async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          process.nextTick(() => cb(null, '', ''));
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.readFile).mockResolvedValue(OPENAI_WHISPER_JSON);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(fs.readFile).toHaveBeenCalledWith(expect.stringMatching(/\.json$/), 'utf-8');
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toEqual({ start: 0, end: 2, text: 'Hello world' });
      expect(result.segments[1]).toEqual({ start: 2, end: 5, text: 'How are you' });
      expect(result.text).toBe('Hello world How are you');
      expect(result.language).toBe('en');
    });

    it('cleans up the output JSON file', async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          process.nextTick(() => cb(null, '', ''));
          return { kill: vi.fn() } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.readFile).mockResolvedValue(OPENAI_WHISPER_JSON);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await service.transcribe('/tmp/meeting.webm');

      // Should clean up both the wav file and the json output file
      const unlinkCalls = vi.mocked(fs.unlink).mock.calls.map((c) => c[0] as string);
      expect(unlinkCalls.some((p) => p.endsWith('.json'))).toBe(true);
      expect(unlinkCalls.some((p) => p.endsWith('.wav'))).toBe(true);
    });
  });

  describe('cancel', () => {
    it('kills the running child process', async () => {
      const mockKill = vi.fn();
      let callCount = 0;
      let resolveSecond: (() => void) | null = null;

      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          callCount++;
          const cb = callback as (err: null, stdout: string, stderr: string) => void;
          if (callCount === 1) {
            process.nextTick(() => cb(null, '', ''));
          } else {
            // second call (whisper) — hold it so we can cancel
            resolveSecond = () => cb(null, WHISPER_JSON_OUTPUT, '');
          }
          return { kill: mockKill } as unknown as ChildProcess;
        },
      );
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({} as import('fs').Stats);

      const transcribePromise = service.transcribe('/tmp/meeting.webm');
      // Wait for ffmpeg to complete, stat to resolve, and whisper to start
      await new Promise((r) => setTimeout(r, 10));

      service.cancel();

      expect(mockKill).toHaveBeenCalled();

      // Resolve whisper so the promise settles
      (resolveSecond as (() => void) | null)?.();
      await transcribePromise.catch(() => {});
    });

    it('does nothing when no process is running', () => {
      expect(() => service.cancel()).not.toThrow();
    });
  });
});
