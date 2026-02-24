import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// Mock electron before importing the module under test
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData'),
  },
  desktopCapturer: {
    getSources: vi.fn(),
  },
}));

// Mock fs/promises before importing the module under test
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

import { app, desktopCapturer } from 'electron';
import * as fs from 'fs/promises';
import { createRecordingService } from '../recording-service';

describe('RecordingService', () => {
  let service: ReturnType<typeof createRecordingService>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(app.getPath).mockReturnValue('/mock/userData');
    service = createRecordingService(app);
  });

  describe('getRecordingsDir', () => {
    it('returns the recordings directory path inside userData', () => {
      const dir = service.getRecordingsDir();
      expect(dir).toBe('/mock/userData/recordings');
    });

    it('calls app.getPath with "userData"', () => {
      service.getRecordingsDir();
      expect(app.getPath).toHaveBeenCalledWith('userData');
    });
  });

  describe('getRecordingPath', () => {
    it('returns a path inside the recordings dir', () => {
      const meetingId = 'meeting-123';
      const result = service.getRecordingPath(meetingId);
      expect(result.startsWith('/mock/userData/recordings/')).toBe(true);
    });

    it('includes the meetingId in the filename', () => {
      const meetingId = 'abc-def-ghi';
      const result = service.getRecordingPath(meetingId);
      const filename = path.basename(result);
      expect(filename).toContain('abc-def-ghi');
    });

    it('returns a .webm file', () => {
      const result = service.getRecordingPath('any-id');
      expect(result).toMatch(/\.webm$/);
    });
  });

  describe('saveRecording', () => {
    it('creates the recordings directory', async () => {
      const buffer = Buffer.from('fake-audio-data');
      await service.saveRecording('meeting-1', buffer);
      expect(fs.mkdir).toHaveBeenCalledWith(
        '/mock/userData/recordings',
        { recursive: true },
      );
    });

    it('writes the buffer to a webm file', async () => {
      const buffer = Buffer.from('fake-audio-data');
      await service.saveRecording('meeting-1', buffer);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/userData\/recordings\/.*meeting-1.*\.webm$/),
        buffer,
      );
    });

    it('returns the file path where the recording was saved', async () => {
      const buffer = Buffer.from('fake-audio-data');
      const result = await service.saveRecording('meeting-1', buffer);
      expect(result).toMatch(/\/mock\/userData\/recordings\/.*meeting-1.*\.webm$/);
    });
  });

  describe('deleteRecording', () => {
    it('deletes the file at the given path', async () => {
      const audioPath = '/mock/userData/recordings/2024-01-01-meeting-1.webm';
      await service.deleteRecording(audioPath);
      expect(fs.unlink).toHaveBeenCalledWith(audioPath);
    });

    it('throws if the path is outside the recordings directory', async () => {
      const unsafePath = '/mock/userData/recordings/../../../etc/passwd';
      await expect(service.deleteRecording(unsafePath)).rejects.toThrow(
        'Path is outside recordings directory',
      );
    });

    it('throws if the path is in a completely different directory', async () => {
      const unsafePath = '/tmp/evil.webm';
      await expect(service.deleteRecording(unsafePath)).rejects.toThrow(
        'Path is outside recordings directory',
      );
    });

    it('does not call unlink for unsafe paths', async () => {
      const unsafePath = '/tmp/evil.webm';
      await expect(service.deleteRecording(unsafePath)).rejects.toThrow();
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('getAudioSources', () => {
    it('calls desktopCapturer.getSources with audio types', async () => {
      vi.mocked(desktopCapturer.getSources).mockResolvedValue([]);
      await service.getAudioSources();
      expect(desktopCapturer.getSources).toHaveBeenCalledWith({
        types: ['screen', 'window'],
      });
    });

    it('returns mapped audio sources', async () => {
      vi.mocked(desktopCapturer.getSources).mockResolvedValue([
        { id: 'screen:0', name: 'Entire Screen', thumbnail: {} as Electron.NativeImage, appIcon: {} as Electron.NativeImage, display_id: '' },
        { id: 'window:123', name: 'My App', thumbnail: {} as Electron.NativeImage, appIcon: {} as Electron.NativeImage, display_id: '' },
      ]);
      const sources = await service.getAudioSources();
      expect(sources).toHaveLength(2);
      expect(sources[0]).toEqual({ id: 'screen:0', name: 'Entire Screen', type: 'screen' });
      expect(sources[1]).toEqual({ id: 'window:123', name: 'My App', type: 'window' });
    });

    it('returns empty array when no sources available', async () => {
      vi.mocked(desktopCapturer.getSources).mockResolvedValue([]);
      const sources = await service.getAudioSources();
      expect(sources).toEqual([]);
    });
  });
});
