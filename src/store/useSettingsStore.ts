import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LOCATION_SYNC_INTERVAL_MS, SAFE_RADIUS_METERS } from '../utils/constants';

interface SettingsState {
  /** Audio is intentionally disabled until an actual sound implementation ships. */
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  gpsIntervalMs: number;
  defaultRadiusMeters: number;
  toggleSound: () => void;
  toggleVibration: () => void;
}

export const useSettingsStore = create<SettingsState>()(persist(
  (set) => ({
    soundEnabled: false,
    vibrationEnabled: true,
    gpsIntervalMs: LOCATION_SYNC_INTERVAL_MS,
    defaultRadiusMeters: SAFE_RADIUS_METERS,
    toggleSound: () => {},
    toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
  }),
  {
    name: '@TravelTrack:settings-v1',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({ vibrationEnabled: state.vibrationEnabled }),
  }
));
