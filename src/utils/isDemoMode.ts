// src/utils/isDemoMode.ts
//
// Demo Mode is automatically enabled when the native Wi-Fi Direct module
// is not available — i.e., when running in Expo Go or the web.
// In a real APK build the native module IS available, so demo mode is off.

import { NativeModules } from 'react-native';

/**
 * Returns true if we are running in Expo Go / web where native Wi-Fi
 * Direct is NOT available. False in a real APK build.
 */
export function isDemoMode(): boolean {
  // The native module registered by react-native-wifi-p2p
  const p2pModule = NativeModules.WiFiP2PManagerModule;
  return !p2pModule;
}
