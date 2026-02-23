import { StateCreator } from 'zustand';

export interface SettingsSlice {
  userFirstName: string;
  userLastName: string;
  weatherCity: string;
  setUserProfile: (firstName: string, lastName: string) => void;
  setWeatherCity: (city: string) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  userFirstName: '',
  userLastName: '',
  weatherCity: '',
  setUserProfile: (firstName, lastName) => set({ userFirstName: firstName, userLastName: lastName }),
  setWeatherCity: (city) => set({ weatherCity: city }),
});
