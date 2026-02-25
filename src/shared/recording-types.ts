export type RecordingMode = 'system' | 'mic' | 'both';
export type RecordingStatus = 'idle' | 'recording' | 'stopping';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TranscriptionProvider = 'local' | 'api';
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface WhisperModelInfo {
  name: WhisperModel;
  size: string;
  sizeBytes: number;
  description: string;
  downloaded: boolean;
  downloading: boolean;
  downloadProgress: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface RecordingState {
  status: RecordingStatus;
  meetingId: string | null;
  duration: number;
  mode: RecordingMode | null;
}

export interface AudioSource {
  id: string;
  name: string;
  type: 'screen' | 'window';
}
