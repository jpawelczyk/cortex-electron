import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { z } from 'zod';
import type { TranscriptionService } from '../recording/transcription-service';
import type { DbContext } from '../db/types';

const MeetingIdSchema = z.string().uuid();

function toIpcError(err: unknown): Error {
  if (err instanceof Error) {
    const plain = new Error(err.message);
    plain.stack = err.stack;
    return plain;
  }
  return new Error(String(err));
}

export function registerTranscriptionHandlers(
  transcriptionService: TranscriptionService,
  ctx: DbContext,
  getMainWindow: () => BrowserWindow | null,
): void {
  const { db } = ctx;

  ipcMain.handle('transcription:check', async () => {
    try {
      return await transcriptionService.isAvailable();
    } catch (err) {
      console.error('[IPC transcription:check]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });

  ipcMain.handle('transcription:start', async (_, meetingId: unknown) => {
    try {
      const validatedId = MeetingIdSchema.parse(meetingId);

      const meeting = await db.getOptional<Record<string, unknown>>(
        'SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL',
        [validatedId],
      );
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      if (!meeting.audio_path) {
        throw new Error('No audio recording found for this meeting');
      }

      const audioPath = meeting.audio_path as string;
      const now = new Date().toISOString();

      // Set status to processing
      await db.execute(
        'UPDATE meetings SET transcription_status = ?, updated_at = ? WHERE id = ?',
        ['processing', now, validatedId],
      );

      try {
        const result = await transcriptionService.transcribe(audioPath, {
          onProgress: (progress) => {
            const win = getMainWindow();
            if (win && !win.isDestroyed()) {
              win.webContents.send('transcription:progress', { meetingId: validatedId, progress });
            }
          },
        });

        const updatedAt = new Date().toISOString();
        await db.execute(
          `UPDATE meetings SET
            transcript = ?,
            transcript_segments = ?,
            transcription_status = ?,
            updated_at = ?
          WHERE id = ?`,
          [
            result.text,
            JSON.stringify(result.segments),
            'completed',
            updatedAt,
            validatedId,
          ],
        );

        return result;
      } catch (err) {
        const failedAt = new Date().toISOString();
        await db.execute(
          'UPDATE meetings SET transcription_status = ?, updated_at = ? WHERE id = ?',
          ['failed', failedAt, validatedId],
        ).catch(() => {});
        throw err;
      }
    } catch (err) {
      console.error('[IPC transcription:start]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });

  ipcMain.handle('transcription:cancel', () => {
    transcriptionService.cancel();
  });
}
