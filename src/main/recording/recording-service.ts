import path from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
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
    return filePath;
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
