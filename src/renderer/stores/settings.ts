import { StateCreator } from 'zustand';
import type { TranscriptionProvider, WhisperModel, RecordingMode } from '@shared/recording-types';

export interface SettingsSlice {
  userFirstName: string;
  userLastName: string;
  weatherCity: string;
  transcriptionProvider: TranscriptionProvider;
  openaiApiKey: string;
  whisperModel: WhisperModel;
  defaultRecordingMode: RecordingMode;
  autoTranscribe: boolean;
  setUserProfile: (firstName: string, lastName: string) => void;
  setWeatherCity: (city: string) => void;
  setTranscriptionProvider: (provider: TranscriptionProvider) => void;
  setOpenaiApiKey: (key: string) => void;
  setWhisperModel: (model: WhisperModel) => void;
  setDefaultRecordingMode: (mode: RecordingMode) => void;
  setAutoTranscribe: (enabled: boolean) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  userFirstName: '',
  userLastName: '',
  weatherCity: '',
  transcriptionProvider: 'local',
  openaiApiKey: '',
  whisperModel: 'base',
  defaultRecordingMode: 'both',
  autoTranscribe: false,
  setUserProfile: (firstName, lastName) => set({ userFirstName: firstName, userLastName: lastName }),
  setWeatherCity: (city) => set({ weatherCity: city }),
  setTranscriptionProvider: (provider) => set({ transcriptionProvider: provider }),
  setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
  setWhisperModel: (model) => set({ whisperModel: model }),
  setDefaultRecordingMode: (mode) => set({ defaultRecordingMode: mode }),
  setAutoTranscribe: (enabled) => set({ autoTranscribe: enabled }),
});
