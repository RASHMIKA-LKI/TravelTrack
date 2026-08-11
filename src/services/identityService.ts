import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CANONICAL_KEY = '@TravelTrack:peer-id-v2';
const LEGACY_KEYS = ['@TravelTrack:peer-id', '@traveltrack_device_id'];

let identityPromise: Promise<string> | null = null;

function createPeerId(): string {
  return `peer-${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreatePeerId(): Promise<string> {
  if (identityPromise) return identityPromise;

  identityPromise = (async () => {
    const canonical = await AsyncStorage.getItem(CANONICAL_KEY);
    if (canonical) return canonical;

    for (const legacyKey of LEGACY_KEYS) {
      const legacy = await AsyncStorage.getItem(legacyKey);
      if (legacy) {
        await AsyncStorage.setItem(CANONICAL_KEY, legacy);
        return legacy;
      }
    }

    const created = createPeerId();
    await AsyncStorage.setItem(CANONICAL_KEY, created);
    return created;
  })().catch((error) => {
    identityPromise = null;
    throw error;
  });

  return identityPromise;
}
