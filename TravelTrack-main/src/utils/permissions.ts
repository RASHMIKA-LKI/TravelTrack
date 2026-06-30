import { PermissionsAndroid, Platform, Alert } from "react-native";

export async function requestAllPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
    ];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(results).every(
      (result) => result === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!allGranted) {
      Alert.alert(
        "Permissions Required",
        "TravelTrack needs Location and Wi-Fi permissions to track your group. Please enable them in Settings.",
        [{ text: "OK" }],
      );
    }

    return allGranted;
  } catch (err) {
    console.error("Permission request error:", err);
    return false;
  }
}

export async function hasLocationPermission(): Promise<boolean> {
  const result = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result;
}
