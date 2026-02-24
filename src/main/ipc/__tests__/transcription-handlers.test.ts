import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

vi.mock('zod', async (importOriginal) => {
  return importOriginal();
});

import { ipcMain } from 'electron';
import type { TranscriptionService } from '../../recording/transcription-service';
import type { AsyncDatabase } from '../../db/types';
import { registerTranscriptionHandlers } from '../transcription-handlers';

// Minimal mock AsyncDatabase
function createMockDb(meetingRow: Record<string, unknown> | null = null): AsyncDatabase {
  return {
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    getAll: vi.fn().mockResolvedValue([]),
    getOptional: vi.fn().mockResolvedValue(meetingRow),
    writeTransaction: vi.fn(async (fn) => fn({
      execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      getAll: vi.fn().mockResolvedValue([]),
      getOptional: vi.fn().mockResolvedValue(meetingRow),
      writeTransaction: vi.fn(),
    } as AsyncDatabase)),
  };
}

function createMockTranscriptionService(overrides: Partial<TranscriptionService> = {}): TranscriptionService {
  return {
    isAvailable: vi.fn().mockResolvedValue({ whisper: true, ffmpeg: true }),
    transcribe: vi.fn().mockResolvedValue({
      text: 'Hello world',
      segments: [{ start: 0, end: 2000, text: 'Hello world' }],
      language: 'en',
    }),
    cancel: vi.fn(),
    ...overrides,
  };
}

function getHandler(channel: string) {
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
  if (!call) throw new Error(`No handler registered for ${channel}`);
  return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

const MOCK_MEETING = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  title: 'Test Meeting',
  audio_path: '/tmp/recording.webm',
  transcription_status: null,
  is_all_day: 0,
};

describe('registerTranscriptionHandlers', () => {
  let transcriptionService: TranscriptionService;
  let db: AsyncDatabase;
  let getMainWindow: () => { webContents: { send: ReturnType<typeof vi.fn> } } | null;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockClear();
    transcriptionService = createMockTranscriptionService();
    db = createMockDb(MOCK_MEETING);
    mockSend = vi.fn();
    getMainWindow = () => ({ webContents: { send: mockSend }, isDestroyed: () => false });

    registerTranscriptionHandlers(transcriptionService, { db }, getMainWindow as () => Electron.BrowserWindow | null);
  });

  describe('channel registration', () => {
    it('registers transcription:check', () => {
      const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch);
      expect(channels).toContain('transcription:check');
    });

    it('registers transcription:start', () => {
      const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch);
      expect(channels).toContain('transcription:start');
    });

    it('registers transcription:cancel', () => {
      const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch);
      expect(channels).toContain('transcription:cancel');
    });
  });

  describe('transcription:check', () => {
    it('returns availability from transcription service', async () => {
      const handler = getHandler('transcription:check');
      const result = await handler({});
      expect(result).toEqual({ whisper: true, ffmpeg: true });
      expect(transcriptionService.isAvailable).toHaveBeenCalled();
    });

    it('propagates errors', async () => {
      vi.mocked(transcriptionService.isAvailable).mockRejectedValue(new Error('check failed'));
      const handler = getHandler('transcription:check');
      await expect(handler({})).rejects.toThrow('check failed');
    });
  });

  describe('transcription:start', () => {
    it('rejects invalid meetingId (not a UUID)', async () => {
      const handler = getHandler('transcription:start');
      await expect(handler({}, 'not-a-uuid')).rejects.toThrow();
    });

    it('throws when meeting not found', async () => {
      const emptyDb = createMockDb(null);
      vi.mocked(ipcMain.handle).mockClear();
      registerTranscriptionHandlers(transcriptionService, { db: emptyDb }, getMainWindow as () => Electron.BrowserWindow | null);
      const handler = getHandler('transcription:start');
      await expect(handler({}, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).rejects.toThrow('Meeting not found');
    });

    it('throws when meeting has no audio_path', async () => {
      const noAudioDb = createMockDb({ ...MOCK_MEETING, audio_path: null });
      vi.mocked(ipcMain.handle).mockClear();
      registerTranscriptionHandlers(transcriptionService, { db: noAudioDb }, getMainWindow as () => Electron.BrowserWindow | null);
      const handler = getHandler('transcription:start');
      await expect(handler({}, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).rejects.toThrow('No audio recording');
    });

    it('sets transcription_status to processing before starting', async () => {
      const handler = getHandler('transcription:start');
      await handler({}, MOCK_MEETING.id);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('transcription_status'),
        expect.arrayContaining(['processing']),
      );
    });

    it('calls transcribe with the audio_path', async () => {
      const handler = getHandler('transcription:start');
      await handler({}, MOCK_MEETING.id);
      expect(transcriptionService.transcribe).toHaveBeenCalledWith(
        MOCK_MEETING.audio_path,
        expect.objectContaining({ onProgress: expect.any(Function) }),
      );
    });

    it('updates meeting with transcript and status=completed on success', async () => {
      const handler = getHandler('transcription:start');
      await handler({}, MOCK_MEETING.id);
      const calls = vi.mocked(db.execute).mock.calls;
      const completedCall = calls.find(([sql, params]) =>
        String(sql).includes('transcription_status') &&
        Array.isArray(params) && params.includes('completed')
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![1]).toContain('Hello world');
    });

    it('stores transcript_segments as JSON string', async () => {
      const handler = getHandler('transcription:start');
      await handler({}, MOCK_MEETING.id);
      const calls = vi.mocked(db.execute).mock.calls;
      const completedCall = calls.find(([sql, params]) =>
        String(sql).includes('transcription_status') &&
        Array.isArray(params) && params.includes('completed')
      );
      const segmentsParam = completedCall![1]!.find((p) =>
        typeof p === 'string' && p.includes('[{')
      );
      expect(segmentsParam).toBeDefined();
      const parsed = JSON.parse(segmentsParam as string);
      expect(parsed).toEqual([{ start: 0, end: 2000, text: 'Hello world' }]);
    });

    it('sets transcription_status to failed on transcription error', async () => {
      vi.mocked(transcriptionService.transcribe).mockRejectedValue(new Error('whisper failed'));
      const handler = getHandler('transcription:start');
      await expect(handler({}, MOCK_MEETING.id)).rejects.toThrow('whisper failed');
      const calls = vi.mocked(db.execute).mock.calls;
      const failedCall = calls.find(([sql, params]) =>
        String(sql).includes('transcription_status') &&
        Array.isArray(params) && params.includes('failed')
      );
      expect(failedCall).toBeDefined();
    });

    it('sends progress events to the main window', async () => {
      vi.mocked(transcriptionService.transcribe).mockImplementation(
        async (_path, opts) => {
          opts?.onProgress?.(50);
          opts?.onProgress?.(100);
          return { text: 'Hi', segments: [], language: 'en' };
        }
      );
      const handler = getHandler('transcription:start');
      await handler({}, MOCK_MEETING.id);
      expect(mockSend).toHaveBeenCalledWith(
        'transcription:progress',
        expect.objectContaining({ meetingId: MOCK_MEETING.id, progress: 50 }),
      );
      expect(mockSend).toHaveBeenCalledWith(
        'transcription:progress',
        expect.objectContaining({ meetingId: MOCK_MEETING.id, progress: 100 }),
      );
    });
  });

  describe('transcription:cancel', () => {
    it('calls cancel on the transcription service', async () => {
      const handler = getHandler('transcription:cancel');
      await handler({});
      expect(transcriptionService.cancel).toHaveBeenCalled();
    });
  });
});
