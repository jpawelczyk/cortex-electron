import type { StateCreator } from 'zustand';
import type { RecordingMode, RecordingStatus, AudioSource } from '@shared/recording-types';
import type { SettingsSlice } from './settings';

export interface RecordingSlice {
  recordingStatus: RecordingStatus;
  recordingMeetingId: string | null;
  recordingDuration: number;
  recordingMode: RecordingMode | null;
  audioSources: AudioSource[];

  startRecording: (meetingId: string, mode: RecordingMode, sourceId?: string) => Promise<void>;
  stopRecording: () => Promise<string | null>;
  tickRecordingDuration: () => void;
  fetchAudioSources: () => Promise<void>;
  resetRecording: () => void;
}

// Module-level state for non-serializable MediaRecorder data
let mediaRecorder: MediaRecorder | null = null;
let recordingChunks: Blob[] = [];
let activeStreams: MediaStream[] = [];
let activeAudioContext: AudioContext | null = null;

async function getMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

async function getSystemStream(sourceId: string): Promise<MediaStream> {
  // Tell the main process which source to grant before triggering getDisplayMedia
  await window.cortex.recording.selectSource(sourceId);
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true, // Required — getDisplayMedia rejects video: false
  });
  // Strip any video tracks that Chromium may still include
  for (const track of stream.getVideoTracks()) {
    track.stop();
    stream.removeTrack(track);
  }
  if (stream.getAudioTracks().length === 0) {
    throw new Error(
      'No system audio track available. Grant "Screen & System Audio Recording" permission in System Settings > Privacy & Security.',
    );
  }
  return stream;
}

async function getMergedStream(sourceId: string): Promise<MediaStream> {
  const [systemStream, micStream] = await Promise.all([
    getSystemStream(sourceId),
    getMicStream(),
  ]);
  activeStreams = [systemStream, micStream];

  activeAudioContext = new AudioContext();
  const destination = activeAudioContext.createMediaStreamDestination();
  const systemSource = activeAudioContext.createMediaStreamSource(systemStream);
  const micSource = activeAudioContext.createMediaStreamSource(micStream);
  systemSource.connect(destination);
  micSource.connect(destination);
  return destination.stream;
}

export const createRecordingSlice: StateCreator<RecordingSlice, [], [], RecordingSlice> = (set, get) => ({
  recordingStatus: 'idle',
  recordingMeetingId: null,
  recordingDuration: 0,
  recordingMode: null,
  audioSources: [],

  startRecording: async (meetingId, mode, sourceId) => {
    if (get().recordingStatus !== 'idle') return;
    let stream: MediaStream;

    try {
      if (mode === 'mic') {
        stream = await getMicStream();
        activeStreams = [stream];
      } else if (mode === 'system') {
        stream = await getSystemStream(sourceId ?? '');
        activeStreams = [stream];
      } else {
        // 'both'
        stream = await getMergedStream(sourceId ?? '');
      }
    } catch (err) {
      console.error('[RecordingSlice] Failed to acquire audio stream:', err);
      // Clean up any partially-acquired streams
      for (const s of activeStreams) {
        for (const track of s.getTracks()) track.stop();
      }
      activeStreams = [];
      throw err;
    }

    recordingChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordingChunks.push(e.data);
      }
    };

    mediaRecorder.start(10_000);

    set({
      recordingStatus: 'recording',
      recordingMeetingId: meetingId,
      recordingMode: mode,
      recordingDuration: 0,
    });
  },

  stopRecording: async () => {
    const { recordingMeetingId } = get();
    if (!mediaRecorder || !recordingMeetingId) return null;

    set({ recordingStatus: 'stopping' });

    return new Promise<string | null>((resolve) => {
      mediaRecorder!.onstop = async () => {
        try {
          const blob = new Blob(recordingChunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const audioPath = await window.cortex.recording.save(recordingMeetingId, arrayBuffer);
          const durationSeconds = get().recordingDuration;
          await window.cortex.meetings.update(recordingMeetingId, {
            audio_path: audioPath,
            recording_duration: durationSeconds,
          });

          // Stop all tracks
          for (const stream of activeStreams) {
            for (const track of stream.getTracks()) {
              track.stop();
            }
          }
          if (activeAudioContext) { activeAudioContext.close(); activeAudioContext = null; }
          activeStreams = [];
          recordingChunks = [];
          mediaRecorder = null;

          set({
            recordingStatus: 'idle',
            recordingMeetingId: null,
            recordingMode: null,
            recordingDuration: 0,
          });

          // Auto-transcribe if enabled
          const settingsState = get() as unknown as SettingsSlice;
          if (settingsState.autoTranscribe) {
            window.cortex.transcription.start(recordingMeetingId, {
              provider: settingsState.transcriptionProvider,
              apiKey: settingsState.openaiApiKey,
              model: settingsState.whisperModel,
            }).catch((err: unknown) => {
              console.error('[RecordingSlice] auto-transcribe failed:', err);
            });
          }

          resolve(audioPath);
        } catch (err) {
          console.error('[RecordingSlice] stopRecording failed:', err);
          for (const stream of activeStreams) {
            for (const track of stream.getTracks()) { track.stop(); }
          }
          if (activeAudioContext) { activeAudioContext.close(); activeAudioContext = null; }
          activeStreams = [];
          recordingChunks = [];
          mediaRecorder = null;
          set({ recordingStatus: 'idle', recordingMeetingId: null, recordingMode: null, recordingDuration: 0 });
          resolve(null);
        }
      };

      mediaRecorder!.stop();
    });
  },

  tickRecordingDuration: () => {
    set((state) => ({ recordingDuration: state.recordingDuration + 1 }));
  },

  fetchAudioSources: async () => {
    try {
      const sources = await window.cortex.recording.getSources();
      set({ audioSources: sources });
    } catch (err) {
      console.error('[RecordingSlice] fetchAudioSources failed:', err);
    }
  },

  resetRecording: () => {
    mediaRecorder = null;
    recordingChunks = [];
    for (const stream of activeStreams) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    activeStreams = [];

    set({
      recordingStatus: 'idle',
      recordingMeetingId: null,
      recordingDuration: 0,
      recordingMode: null,
    });
  },
});
