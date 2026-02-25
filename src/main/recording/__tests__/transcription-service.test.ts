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

/**
 * Helper: create a command-aware execFile mock.
 * Routes calls based on the executed command name.
 */
function mockExecFileRouter(
  handlers: Record<string, (args: string[], opts: Record<string, unknown>) => { err: Error | null; stdout: string }>,
  opts?: { killFn?: ReturnType<typeof vi.fn>; onCall?: (cmd: string, args: string[], callOpts: Record<string, unknown>) => void },
) {
  const killFn = opts?.killFn ?? vi.fn();
  vi.mocked(childProcess.execFile).mockImplementation(
    (cmd: unknown, args: unknown, callOpts: unknown, callback: unknown) => {
      const cmdStr = cmd as string;
      const argArr = args as string[];
      const optsObj = callOpts as Record<string, unknown>;
      const cb = callback as (err: Error | null, stdout: string, stderr: string) => void;
      opts?.onCall?.(cmdStr, argArr, optsObj);

      // `which` checks — route based on the binary being looked up
      const key = cmdStr === 'which' ? `which:${argArr[0]}` : cmdStr;

      const handler = handlers[key] ?? handlers['*'];
      if (handler) {
        const result = handler(argArr, optsObj);
        process.nextTick(() => cb(result.err, result.stdout, ''));
      } else {
        process.nextTick(() => cb(new Error(`Unexpected command: ${cmdStr} ${argArr.join(' ')}`), '', ''));
      }
      return { kill: killFn } as unknown as ChildProcess;
    },
  );
  return killFn;
}

describe('TranscriptionService', () => {
  let service: ReturnType<typeof createTranscriptionService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createTranscriptionService('/models');
  });

  describe('isAvailable', () => {
    it('returns true for whisper when which finds whisper-cpp', async () => {
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'which:ffmpeg': () => ({ err: null, stdout: '/usr/local/bin/ffmpeg' }),
      });
      const result = await service.isAvailable();
      expect(result.whisper).toBe(true);
      expect(result.ffmpeg).toBe(true);
    });

    it('falls back to "whisper" when whisper-cpp not found', async () => {
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: new Error('not found'), stdout: '' }),
        'which:whisper': () => ({ err: null, stdout: '/usr/local/bin/whisper' }),
        'which:ffmpeg': () => ({ err: null, stdout: '/usr/local/bin/ffmpeg' }),
      });
      const result = await service.isAvailable();
      expect(result.whisper).toBe(true);
    });

    it('returns false for whisper when neither whisper-cpp nor whisper found', async () => {
      mockExecFileRouter({
        '*': () => ({ err: new Error('not found'), stdout: '' }),
      });
      const result = await service.isAvailable();
      expect(result.whisper).toBe(false);
    });

    it('returns false for ffmpeg when not found', async () => {
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'which:ffmpeg': () => ({ err: new Error('not found'), stdout: '' }),
      });
      const result = await service.isAvailable();
      expect(result.ffmpeg).toBe(false);
    });
  });

  describe('transcribe with whisper-cpp', () => {
    beforeEach(() => {
      vi.mocked(fs.stat).mockResolvedValue({} as import('fs').Stats);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(WHISPER_JSON_OUTPUT);
    });

    function setupWhisperCpp() {
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper-cpp': () => ({ err: null, stdout: '' }), // output goes to file
      });
    }

    it('calls ffmpeg to convert webm to wav with correct flags', async () => {
      const calls: { cmd: string; args: string[] }[] = [];
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper-cpp': () => ({ err: null, stdout: '' }),
      }, {
        onCall: (cmd, args) => calls.push({ cmd, args }),
      });

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
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper-cpp': () => ({ err: null, stdout: '' }),
      }, {
        onCall: (cmd, args) => calls.push({ cmd, args }),
      });

      await service.transcribe('/tmp/meeting.webm', { model: 'base' });

      const whisperCall = calls.find((c) => c.cmd === 'whisper-cpp');
      expect(whisperCall).toBeDefined();
      expect(whisperCall!.args).toContain('--output-json');
      expect(whisperCall!.args).toContain('--model');
      expect(whisperCall!.args).toContain('/models/ggml-base.bin');
    });

    it('reads JSON output from file (not stdout)', async () => {
      setupWhisperCpp();

      await service.transcribe('/tmp/meeting.webm');

      // Should read the JSON file produced by whisper-cpp
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringMatching(/\.json$/), 'utf-8');
    });

    it('parses whisper JSON output into TranscriptSegments', async () => {
      setupWhisperCpp();

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toEqual({ start: 0, end: 2, text: 'Hello world' });
      expect(result.segments[1]).toEqual({ start: 2, end: 5, text: 'How are you' });
    });

    it('returns concatenated text from all segments', async () => {
      setupWhisperCpp();

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(result.text).toBe('Hello world How are you');
    });

    it('returns the detected language', async () => {
      setupWhisperCpp();

      const result = await service.transcribe('/tmp/meeting.webm');

      expect(result.language).toBe('en');
    });

    it('cleans up the temp wav file after transcription', async () => {
      setupWhisperCpp();

      await service.transcribe('/tmp/meeting.webm');

      expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.wav$/));
    });

    it('cleans up the temp wav file even when transcription fails', async () => {
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'which:whisper': () => ({ err: new Error('not found'), stdout: '' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper-cpp': () => ({ err: new Error('whisper failed'), stdout: '' }),
      });

      await expect(service.transcribe('/tmp/meeting.webm')).rejects.toThrow();

      expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.wav$/));
    });

    it('reports progress via onProgress callback', async () => {
      setupWhisperCpp();

      const progressValues: number[] = [];
      await service.transcribe('/tmp/meeting.webm', {
        onProgress: (pct) => progressValues.push(pct),
      });

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it('rejects when ffmpeg conversion fails', async () => {
      mockExecFileRouter({
        '*': () => ({ err: new Error('ffmpeg: command not found'), stdout: '' }),
      });

      await expect(service.transcribe('/tmp/meeting.webm')).rejects.toThrow(
        'ffmpeg: command not found',
      );
    });

    it('passes a timeout to execFile so it does not hang forever', async () => {
      const optsList: Array<Record<string, unknown>> = [];
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper-cpp': () => ({ err: null, stdout: '' }),
      }, {
        onCall: (_cmd, _args, opts) => optsList.push(opts),
      });

      await service.transcribe('/tmp/meeting.webm');

      // ffmpeg and whisper-cpp calls (not `which`) should have a timeout
      const timedCalls = optsList.filter((o) => typeof o.timeout === 'number' && o.timeout > 0);
      expect(timedCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects with a clear error when model file is not found', async () => {
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: null, stdout: '/usr/local/bin/whisper-cpp' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
      });
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      await expect(service.transcribe('/tmp/meeting.webm', { model: 'large' })).rejects.toThrow(
        /model.*not.*downloaded/i,
      );
    });

    it('cleans up the whisper-cpp JSON output file', async () => {
      setupWhisperCpp();

      await service.transcribe('/tmp/meeting.webm');

      const unlinkCalls = vi.mocked(fs.unlink).mock.calls.map((c) => c[0] as string);
      expect(unlinkCalls.some((p) => p.endsWith('.json'))).toBe(true);
    });
  });

  describe('transcribe falls back to OpenAI whisper', () => {
    it('uses OpenAI whisper when whisper-cpp is not installed', async () => {
      const calls: { cmd: string; args: string[] }[] = [];
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: new Error('not found'), stdout: '' }),
        'which:whisper': () => ({ err: null, stdout: '/usr/local/bin/whisper' }),
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper': () => ({ err: null, stdout: '' }),
      }, {
        onCall: (cmd, args) => calls.push({ cmd, args }),
      });
      vi.mocked(fs.readFile).mockResolvedValue(OPENAI_WHISPER_JSON);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.transcribe('/tmp/meeting.webm');

      // Should NOT call whisper-cpp, should call whisper
      expect(calls.some((c) => c.cmd === 'whisper-cpp')).toBe(false);
      const whisperCall = calls.find((c) => c.cmd === 'whisper');
      expect(whisperCall).toBeDefined();
      expect(result.text).toBe('Hello world How are you');
    });
  });

  describe('transcribe with OpenAI whisper', () => {
    beforeEach(async () => {
      // Resolve whisperBinCache to 'whisper' by making whisper-cpp unavailable
      mockExecFileRouter({
        'which:whisper-cpp': () => ({ err: new Error('not found'), stdout: '' }),
        'which:whisper': () => ({ err: null, stdout: '/usr/local/bin/whisper' }),
        'which:ffmpeg': () => ({ err: null, stdout: '/usr/local/bin/ffmpeg' }),
      });
      await service.isAvailable();
      vi.clearAllMocks();
    });

    it('uses --output_format json and omits --language for OpenAI whisper', async () => {
      const calls: { cmd: string; args: string[] }[] = [];
      mockExecFileRouter({
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper': () => ({ err: null, stdout: '' }),
      }, {
        onCall: (cmd, args) => calls.push({ cmd, args }),
      });
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
      mockExecFileRouter({
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper': () => ({ err: null, stdout: '' }),
      });
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
      mockExecFileRouter({
        'ffmpeg': () => ({ err: null, stdout: '' }),
        'whisper': () => ({ err: null, stdout: '' }),
      });
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
      const killFn = vi.fn();
      let resolveWhisper: (() => void) | null = null;

      vi.mocked(childProcess.execFile).mockImplementation(
        (cmd: unknown, args: unknown, _opts: unknown, callback: unknown) => {
          const cmdStr = cmd as string;
          const argArr = args as string[];
          const cb = callback as (err: null, stdout: string, stderr: string) => void;

          if (cmdStr === 'which') {
            process.nextTick(() => cb(null, '/usr/local/bin/' + argArr[0], ''));
          } else if (cmdStr === 'ffmpeg') {
            process.nextTick(() => cb(null, '', ''));
          } else if (cmdStr === 'whisper-cpp') {
            // Hold this call so we can cancel it
            resolveWhisper = () => cb(null, '', '');
          }
          return { kill: killFn } as unknown as ChildProcess;
        },
      );

      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({} as import('fs').Stats);
      vi.mocked(fs.readFile).mockResolvedValue(WHISPER_JSON_OUTPUT);

      const transcribePromise = service.transcribe('/tmp/meeting.webm');
      // Wait for ffmpeg + which + stat to resolve, and whisper-cpp to start
      await new Promise((r) => setTimeout(r, 20));

      service.cancel();

      expect(killFn).toHaveBeenCalled();

      // Resolve whisper so the promise settles
      (resolveWhisper as (() => void) | null)?.();
      await transcribePromise.catch(() => {});
    });

    it('does nothing when no process is running', () => {
      expect(() => service.cancel()).not.toThrow();
    });
  });
});
