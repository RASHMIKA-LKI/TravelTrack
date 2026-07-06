// src/utils/permissions.ts
import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Request ALL permissions the app needs.
 * Call this when the app first starts.
 * Returns true if all granted, false if any denied.
 */
export async function requestAllPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS handles differently

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];

    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
    if (apiLevel >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'TravelTrack needs Location and Wi-Fi permissions to track your group. Please enable them in Settings.',
        [{ text: 'OK' }]
      );
    }

    return allGranted;
  } catch (err) {
    console.error('Permission request error:', err);
    return false;
  }
}

/**
 * Check if location permission is already granted (without asking)
 */
export async function hasLocationPermission(): Promise<boolean> {
  const result = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  return result;
}
