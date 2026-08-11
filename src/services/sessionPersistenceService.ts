import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTrackingStore } from '../store/useTrackingStore';

const STORAGE_KEY = '@TravelTrack:tracking-snapshot-v1';
let initialized = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

interface PersistedSnapshot {
  version: 1;
  savedAt: number;
  group: ReturnType<typeof useTrackingStore.getState>['group'];
  members: ReturnType<typeof useTrackingStore.getState>['members'];
  isTracking: boolean;
  alerts: ReturnType<typeof useTrackingStore.getState>['alerts'];
  messages: ReturnType<typeof useTrackingStore.getState>['messages'];
  pendingSOS: ReturnType<typeof useTrackingStore.getState>['pendingSOS'];
  meetupPoint: ReturnType<typeof useTrackingStore.getState>['meetupPoint'];
}

function makeSnapshot(): PersistedSnapshot {
  const state = useTrackingStore.getState();
  return {
    version: 1,
    savedAt: Date.now(),
    group: state.group,
    members: state.members,
    isTracking: state.isTracking,
    alerts: state.alerts,
    messages: state.messages,
    pendingSOS: state.pendingSOS,
    meetupPoint: state.meetupPoint,
  };
}

export async function initializeSessionPersistence(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const state = useTrackingStore.getState();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const snapshot = raw ? JSON.parse(raw) as PersistedSnapshot : null;
    if (snapshot?.version === 1) {
      state.hydratePersistedData({
        alerts: snapshot.alerts,
        messages: snapshot.messages,
        pendingSOS: snapshot.pendingSOS,
        meetupPoint: snapshot.meetupPoint,
        interruptedSession: snapshot.isTracking && snapshot.group
          ? { group: snapshot.group, members: snapshot.members ?? [], interruptedAt: snapshot.savedAt }
          : null,
      });
    } else {
      state.hydratePersistedData({});
    }
  } catch (error) {
    console.warn('Could not restore the local tracking snapshot:', error);
    state.hydratePersistedData({});
  }

  useTrackingStore.subscribe(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(makeSnapshot()))
        .catch((error) => console.warn('Could not persist tracking snapshot:', error));
    }, 300);
  });
}
