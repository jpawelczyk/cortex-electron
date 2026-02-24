export type RecordingMode = 'system' | 'mic' | 'both';
export type RecordingStatus = 'idle' | 'recording' | 'stopping';

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
