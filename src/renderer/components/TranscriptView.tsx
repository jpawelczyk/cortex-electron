import { useState } from 'react';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';
import type { TranscriptSegment, TranscriptionStatus } from '@shared/recording-types';

interface TranscriptionAPI {
  start: (meetingId: string) => Promise<void>;
  check: () => Promise<{ whisper: boolean; ffmpeg: boolean }>;
}

function getTranscriptionAPI(): TranscriptionAPI | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).cortex?.transcription ?? null;
}

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface TranscriptViewProps {
  meetingId: string;
  audioPath: string | null;
  transcript: string | null;
  transcriptSegments: TranscriptSegment[] | null;
  transcriptionStatus: TranscriptionStatus | null;
  onSeekTo?: (seconds: number) => void;
  onTranscriptionComplete?: () => void;
}

export function TranscriptView({
  meetingId,
  audioPath,
  transcript,
  transcriptSegments,
  transcriptionStatus,
  onSeekTo,
  onTranscriptionComplete,
}: TranscriptViewProps) {
  const [toolsMissing, setToolsMissing] = useState<{ whisper: boolean; ffmpeg: boolean } | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing to show if no audio
  if (!audioPath) return null;

  async function handleStartTranscription() {
    const api = getTranscriptionAPI();
    if (!api) return;

    const tools = await api.check();
    if (!tools.whisper || !tools.ffmpeg) {
      setToolsMissing(tools);
      return;
    }

    setToolsMissing(null);
    setError(null);
    setIsTranscribing(true);
    try {
      await api.start(meetingId);
      onTranscriptionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  }

  // Show tools missing warning
  if (toolsMissing) {
    const missing = [
      !toolsMissing.whisper && 'whisper',
      !toolsMissing.ffmpeg && 'ffmpeg',
    ].filter(Boolean);
    return (
      <div data-testid="tools-missing" className="flex items-start gap-2 text-sm text-amber-400 bg-amber-400/10 rounded-md px-3 py-2">
        <AlertCircle className="size-4 mt-0.5 shrink-0" />
        <span>
          Transcription requires {missing.join(' and ')} to be installed.{' '}
          <button
            className="underline underline-offset-2 hover:text-amber-300"
            onClick={() => setToolsMissing(null)}
          >
            Dismiss
          </button>
        </span>
      </div>
    );
  }

  // Processing states
  if (isTranscribing || transcriptionStatus === 'pending' || transcriptionStatus === 'processing') {
    return (
      <div data-testid="transcription-processing" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Transcribing audio...</span>
      </div>
    );
  }

  // Failed state
  if (transcriptionStatus === 'failed') {
    return (
      <div data-testid="transcription-error" className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>Transcription failed</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartTranscription}
          aria-label="Retry transcription"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Local error from failed start
  if (error) {
    return (
      <div data-testid="transcription-error" className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartTranscription}
          aria-label="Retry transcription"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Completed with segments
  if (transcriptionStatus === 'completed' && transcriptSegments && transcriptSegments.length > 0) {
    return (
      <div className="space-y-1">
        {transcriptSegments.map((seg, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <button
              onClick={() => onSeekTo?.(seg.start)}
              className="text-xs font-mono text-muted-foreground/60 hover:text-primary transition-colors tabular-nums pt-0.5 shrink-0 w-10 text-left"
              aria-label={`Seek to ${formatTime(seg.start)}`}
            >
              {formatTime(seg.start)}
            </button>
            <p className="text-sm text-foreground leading-relaxed">{seg.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // Completed with plain transcript only (no segments)
  if (transcriptionStatus === 'completed' && transcript) {
    return (
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {transcript}
      </div>
    );
  }

  // Audio exists, no transcript yet — show Transcribe button
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleStartTranscription}
        className="gap-1.5"
        aria-label="Transcribe recording"
      >
        <FileText className="size-3.5" />
        Transcribe
      </Button>
    </div>
  );
}
