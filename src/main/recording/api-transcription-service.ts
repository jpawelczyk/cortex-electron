import path from 'path';
import { readFile } from 'fs/promises';
import { net } from 'electron';
import type { TranscriptionResult } from './transcription-service';
import type { TranscriptSegment } from '@shared/recording-types';

export async function transcribeViaApi(
  audioPath: string,
  apiKey: string,
): Promise<TranscriptionResult> {
  const audioBuffer = await readFile(audioPath);
  const ext = path.extname(audioPath) || '.webm';
  const fileName = path.basename(audioPath);

  const blob = new Blob([audioBuffer]);
  const formData = new FormData();
  formData.append('file', blob, fileName.endsWith(ext) ? fileName : `audio${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await net.fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as {
    text: string;
    segments: Array<{ start: number; end: number; text: string }>;
    language: string;
  };

  const segments: TranscriptSegment[] = json.segments.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  return {
    text: json.text,
    segments,
    language: json.language,
  };
}
