import { create } from 'zustand';

interface SettingsState {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  gpsIntervalMs: number;
  defaultRadiusMeters: number;

  toggleSound: () => void;
  toggleVibration: () => void;
  setGpsInterval: (ms: number) => void;
  setDefaultRadius: (meters: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  vibrationEnabled: true,
  gpsIntervalMs: 3000,
  defaultRadiusMeters: 50,

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
  setGpsInterval: (ms) => set({ gpsIntervalMs: ms }),
  setDefaultRadius: (meters) => set({ defaultRadiusMeters: meters }),
}));
