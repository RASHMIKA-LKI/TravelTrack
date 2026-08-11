// src/store/useSettingsStore.ts
import { create } from 'zustand';
import { SAFE_RADIUS_METERS, LOCATION_SYNC_INTERVAL_MS } from '../utils/constants';

interface SettingsState {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  gpsIntervalMs: number;
  defaultRadiusMeters: number;

  toggleSound: () => void;
  toggleVibration: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  vibrationEnabled: true,
  gpsIntervalMs: LOCATION_SYNC_INTERVAL_MS,
  defaultRadiusMeters: SAFE_RADIUS_METERS,

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
}));
