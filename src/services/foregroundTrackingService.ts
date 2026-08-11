import { NativeModules, Platform } from 'react-native';

const nativeService = NativeModules.TravelTracking;

export async function startForegroundTracking(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!nativeService?.start) throw new Error('Foreground tracking is unavailable in this build. Install a new native Android build.');
  await nativeService.start();
}

export async function stopForegroundTracking(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeService?.stop) return;
  await nativeService.stop();
}
