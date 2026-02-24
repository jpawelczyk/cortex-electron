// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TranscriptView } from '../TranscriptView';
import type { TranscriptSegment, TranscriptionStatus } from '@shared/recording-types';

// Mock window.cortex
const mockTranscriptionStart = vi.fn();
const mockTranscriptionCheckTools = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'cortex', {
    value: {
      transcription: {
        start: mockTranscriptionStart,
        check: mockTranscriptionCheckTools,
      },
    },
    writable: true,
    configurable: true,
  });
});

const segments: TranscriptSegment[] = [
  { start: 0, end: 5, text: 'Hello world' },
  { start: 65, end: 70, text: 'This is a test' },
  { start: 130, end: 135, text: 'Third segment' },
];

describe('TranscriptView', () => {
  describe('no audio path', () => {
    it('renders nothing when no audio path and no transcript', () => {
      const { container } = render(
        <TranscriptView
          meetingId="m1"
          audioPath={null}
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('audio exists, no transcript yet', () => {
    it('shows Transcribe button when audio exists and no transcript', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus={null}
        />
      );
      expect(screen.getByRole('button', { name: /transcribe/i })).toBeInTheDocument();
    });

    it('calls transcription.start when Transcribe is clicked', async () => {
      mockTranscriptionStart.mockResolvedValue(undefined);
      mockTranscriptionCheckTools.mockResolvedValue({ whisper: true, ffmpeg: true });

      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus={null}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /transcribe/i }));
      });

      expect(mockTranscriptionStart).toHaveBeenCalledWith('m1');
    });
  });

  describe('transcription status: pending', () => {
    it('shows processing indicator when status is pending', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus="pending"
        />
      );
      expect(screen.getByTestId('transcription-processing')).toBeInTheDocument();
    });
  });

  describe('transcription status: processing', () => {
    it('shows processing indicator when status is processing', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus="processing"
        />
      );
      expect(screen.getByTestId('transcription-processing')).toBeInTheDocument();
    });
  });

  describe('transcription status: failed', () => {
    it('shows error message when status is failed', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus="failed"
        />
      );
      expect(screen.getByTestId('transcription-error')).toBeInTheDocument();
    });

    it('shows retry button when status is failed', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus="failed"
        />
      );
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls transcription.start when Retry is clicked', async () => {
      mockTranscriptionStart.mockResolvedValue(undefined);
      mockTranscriptionCheckTools.mockResolvedValue({ whisper: true, ffmpeg: true });

      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus="failed"
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      expect(mockTranscriptionStart).toHaveBeenCalledWith('m1');
    });
  });

  describe('transcription status: completed with segments', () => {
    it('renders all segment texts', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript="Hello world This is a test Third segment"
          transcriptSegments={segments}
          transcriptionStatus="completed"
        />
      );
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(screen.getByText('This is a test')).toBeInTheDocument();
      expect(screen.getByText('Third segment')).toBeInTheDocument();
    });

    it('renders timestamps in MM:SS format', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript="Hello world This is a test Third segment"
          transcriptSegments={segments}
          transcriptionStatus="completed"
        />
      );
      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(screen.getByText('01:05')).toBeInTheDocument();
      expect(screen.getByText('02:10')).toBeInTheDocument();
    });

    it('calls onSeekTo with segment start time when timestamp is clicked', () => {
      const onSeekTo = vi.fn();
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript="Hello world This is a test Third segment"
          transcriptSegments={segments}
          transcriptionStatus="completed"
          onSeekTo={onSeekTo}
        />
      );
      fireEvent.click(screen.getByText('01:05'));
      expect(onSeekTo).toHaveBeenCalledWith(65);
    });

    it('does not throw when onSeekTo is not provided and timestamp is clicked', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript="Hello world"
          transcriptSegments={[{ start: 0, end: 5, text: 'Hello world' }]}
          transcriptionStatus="completed"
        />
      );
      expect(() => fireEvent.click(screen.getByText('00:00'))).not.toThrow();
    });
  });

  describe('transcription status: completed with plain transcript only', () => {
    it('renders the transcript text when no segments', () => {
      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript="This is the full transcript text."
          transcriptSegments={null}
          transcriptionStatus="completed"
        />
      );
      expect(screen.getByText('This is the full transcript text.')).toBeInTheDocument();
    });
  });

  describe('tools missing', () => {
    it('shows tools missing message when checkTools returns missing tools', async () => {
      mockTranscriptionCheckTools.mockResolvedValue({ whisper: false, ffmpeg: true });

      render(
        <TranscriptView
          meetingId="m1"
          audioPath="/recordings/m1.webm"
          transcript={null}
          transcriptSegments={null}
          transcriptionStatus={null}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /transcribe/i }));
      });

      expect(screen.getByTestId('tools-missing')).toBeInTheDocument();
    });
  });
});
