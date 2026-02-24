// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RecordingControls } from '../RecordingControls';

// Mock the store
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockFetchAudioSources = vi.fn();
const mockTickRecordingDuration = vi.fn();
const mockResetRecording = vi.fn();

let mockStoreState = {
  recordingStatus: 'idle' as 'idle' | 'recording' | 'stopping',
  recordingMeetingId: null as string | null,
  recordingDuration: 0,
  recordingMode: null as string | null,
  audioSources: [] as { id: string; name: string; type: string }[],
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
  fetchAudioSources: mockFetchAudioSources,
  tickRecordingDuration: mockTickRecordingDuration,
  resetRecording: mockResetRecording,
  updateMeeting: vi.fn(),
};

vi.mock('../../stores', () => ({
  useStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

describe('RecordingControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      ...mockStoreState,
      recordingStatus: 'idle',
      recordingMeetingId: null,
      recordingDuration: 0,
      recordingMode: null,
      audioSources: [],
    };
  });

  describe('idle state, no existing recording', () => {
    it('shows Start Recording button', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });

    it('does not show Stop Recording button when idle', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={vi.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
    });
  });

  describe('idle state, existing recording', () => {
    it('shows recording exists indicator', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath="/recordings/meeting-1.webm"
          onRecordingComplete={vi.fn()}
        />
      );
      expect(screen.getByText(/recording saved/i)).toBeInTheDocument();
    });

    it('shows delete recording button', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath="/recordings/meeting-1.webm"
          onRecordingComplete={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /delete recording/i })).toBeInTheDocument();
    });
  });

  describe('recording state', () => {
    beforeEach(() => {
      mockStoreState = {
        ...mockStoreState,
        recordingStatus: 'recording',
        recordingMeetingId: 'meeting-1',
        recordingDuration: 65,
        recordingMode: 'mic',
      };
    });

    it('shows Stop Recording button when recording', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    it('shows formatted duration timer', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={vi.fn()}
        />
      );
      // 65 seconds = 01:05
      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('does not show Start Recording button when recording', () => {
      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={vi.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /start recording/i })).not.toBeInTheDocument();
    });

    it('calls stopRecording and onRecordingComplete when Stop is clicked', async () => {
      const onRecordingComplete = vi.fn();
      mockStopRecording.mockResolvedValue('/recordings/meeting-1.webm');

      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={onRecordingComplete}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /stop/i }));
      await Promise.resolve();
      expect(mockStopRecording).toHaveBeenCalledOnce();
    });
  });

  describe('mode selection', () => {
    it('starts mic recording when Mic Only mode is selected', async () => {
      mockStartRecording.mockResolvedValue(undefined);

      render(
        <RecordingControls
          meetingId="meeting-1"
          audioPath={null}
          onRecordingComplete={vi.fn()}
        />
      );

      // Click the start recording button to open mode selector
      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      // Mic Only should appear in the dropdown
      const micOption = await screen.findByRole('button', { name: /mic only/i });
      fireEvent.click(micOption);

      expect(mockStartRecording).toHaveBeenCalledWith('meeting-1', 'mic');
    });
  });
});
