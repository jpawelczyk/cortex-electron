import { ipcMain } from 'electron';
import { z } from 'zod';
import type { RecordingService } from '../recording/recording-service';

const MeetingIdSchema = z.string().uuid();
const AudioPathSchema = z.string().min(1);

function toIpcError(err: unknown): Error {
  if (err instanceof Error) {
    const plain = new Error(err.message);
    plain.stack = err.stack;
    return plain;
  }
  return new Error(String(err));
}

export function registerRecordingHandlers(recordingService: RecordingService): void {
  ipcMain.handle('recording:get-sources', async () => {
    try {
      return await recordingService.getAudioSources();
    } catch (err) {
      console.error('[IPC recording:get-sources]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });

  ipcMain.handle('recording:save', async (_, meetingId: unknown, data: ArrayBuffer) => {
    try {
      const validatedMeetingId = MeetingIdSchema.parse(meetingId);
      const buffer = Buffer.from(data);
      return await recordingService.saveRecording(validatedMeetingId, buffer);
    } catch (err) {
      console.error('[IPC recording:save]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });

  ipcMain.handle('recording:delete', async (_, audioPath: unknown) => {
    try {
      const validatedPath = AudioPathSchema.parse(audioPath);
      return await recordingService.deleteRecording(validatedPath);
    } catch (err) {
      console.error('[IPC recording:delete]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });
}
