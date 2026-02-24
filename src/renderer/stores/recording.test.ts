import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRecordingSlice, RecordingSlice } from './recording';

type SetFn = (partial: Partial<RecordingSlice> | ((s: RecordingSlice) => Partial<RecordingSlice>)) => void;
type GetFn = () => RecordingSlice;

function createStore(overrides?: Partial<RecordingSlice>): RecordingSlice {
  const state = {} as RecordingSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get: GetFn = () => state;

  const creator = createRecordingSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => RecordingSlice;
  Object.assign(state, creator(set, get, {}), overrides);

  return state;
}

const mockCortex = {
  recording: {
    getSources: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
  meetings: {
    update: vi.fn(),
  },
};

(globalThis as unknown as Record<string, unknown>).window = { cortex: mockCortex };

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((e: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  state: 'inactive',
};

const MockMediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);
(MockMediaRecorder as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = vi.fn().mockReturnValue(true);
(globalThis as unknown as Record<string, unknown>).MediaRecorder = MockMediaRecorder;

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(globalThis, 'navigator', {
  value: { mediaDevices: { getUserMedia: mockGetUserMedia } },
  writable: true,
  configurable: true,
});

const mockStream = { getTracks: () => [{ stop: vi.fn() }] };

describe('RecordingSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockCortex.recording.save.mockResolvedValue('/recordings/meeting-1.webm');
    mockCortex.meetings.update.mockResolvedValue({});
  });

  describe('initial state', () => {
    it('starts with idle status', () => {
      const store = createStore();
      expect(store.recordingStatus).toBe('idle');
    });

    it('starts with null meetingId', () => {
      const store = createStore();
      expect(store.recordingMeetingId).toBeNull();
    });

    it('starts with duration 0', () => {
      const store = createStore();
      expect(store.recordingDuration).toBe(0);
    });

    it('starts with null mode', () => {
      const store = createStore();
      expect(store.recordingMode).toBeNull();
    });

    it('starts with empty audioSources', () => {
      const store = createStore();
      expect(store.audioSources).toEqual([]);
    });
  });

  describe('startRecording', () => {
    it('sets status to recording and stores meetingId', async () => {
      const store = createStore();
      await store.startRecording('meeting-1', 'mic');
      expect(store.recordingStatus).toBe('recording');
      expect(store.recordingMeetingId).toBe('meeting-1');
    });

    it('sets recordingMode', async () => {
      const store = createStore();
      await store.startRecording('meeting-1', 'mic');
      expect(store.recordingMode).toBe('mic');
    });

    it('calls getUserMedia for mic mode', async () => {
      const store = createStore();
      await store.startRecording('meeting-1', 'mic');
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    });

    it('calls getUserMedia with desktop source for system mode', async () => {
      const store = createStore();
      await store.startRecording('meeting-1', 'system', 'screen:1');
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: 'screen:1',
          },
        },
        video: false,
      });
    });

    it('resets duration to 0 on start', async () => {
      const store = createStore({ recordingDuration: 42 });
      await store.startRecording('meeting-1', 'mic');
      expect(store.recordingDuration).toBe(0);
    });
  });

  describe('stopRecording', () => {
    it('returns null if not recording', async () => {
      const store = createStore();
      const result = await store.stopRecording();
      expect(result).toBeNull();
    });

    it('resets status to idle after stop', async () => {
      const store = createStore();
      await store.startRecording('meeting-1', 'mic');

      // Simulate MediaRecorder stop triggering onstop
      const stopPromise = store.stopRecording();
      // Trigger onstop synchronously to resolve the promise
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
      await stopPromise;

      expect(store.recordingStatus).toBe('idle');
    });

    it('resets meetingId to null after stop', async () => {
      const store = createStore();
      await store.startRecording('meeting-1', 'mic');

      const stopPromise = store.stopRecording();
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
      await stopPromise;

      expect(store.recordingMeetingId).toBeNull();
    });
  });

  describe('tickRecordingDuration', () => {
    it('increments duration by 1', () => {
      const store = createStore({ recordingDuration: 5 });
      store.tickRecordingDuration();
      expect(store.recordingDuration).toBe(6);
    });

    it('increments from 0 to 1', () => {
      const store = createStore();
      store.tickRecordingDuration();
      expect(store.recordingDuration).toBe(1);
    });
  });

  describe('fetchAudioSources', () => {
    it('populates audioSources from IPC', async () => {
      const sources = [
        { id: 'screen:1', name: 'Screen 1', type: 'screen' as const },
        { id: 'window:1', name: 'Chrome', type: 'window' as const },
      ];
      mockCortex.recording.getSources.mockResolvedValue(sources);

      const store = createStore();
      await store.fetchAudioSources();

      expect(store.audioSources).toEqual(sources);
    });

    it('calls window.cortex.recording.getSources', async () => {
      mockCortex.recording.getSources.mockResolvedValue([]);

      const store = createStore();
      await store.fetchAudioSources();

      expect(mockCortex.recording.getSources).toHaveBeenCalledOnce();
    });
  });

  describe('resetRecording', () => {
    it('resets all state to initial values', () => {
      const store = createStore({
        recordingStatus: 'recording',
        recordingMeetingId: 'meeting-1',
        recordingDuration: 30,
        recordingMode: 'mic',
      });

      store.resetRecording();

      expect(store.recordingStatus).toBe('idle');
      expect(store.recordingMeetingId).toBeNull();
      expect(store.recordingDuration).toBe(0);
      expect(store.recordingMode).toBeNull();
    });
  });
});
