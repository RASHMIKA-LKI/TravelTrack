import Geolocation from "react-native-geolocation-service";
import { PermissionsAndroid } from "react-native";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  timestamp: number;
}

class LocationService {
  private watchId: number | null = null;
  public onLocationUpdate: ((location: LocationData) => void) | null = null;

  async requestPermission(): Promise<boolean> {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "TravelTrack needs Location",
        message:
          "We need your location to track group members and alert you if someone goes out of range.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async startTracking(): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.error("❌ Location permission denied!");
      return;
    }

    this.watchId = Geolocation.watchPosition(
      (position: any) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          timestamp: position.timestamp,
        };

        console.log(
          "📍 Location update:",
          location.latitude,
          location.longitude,
        );

        if (this.onLocationUpdate) {
          this.onLocationUpdate(location);
        }
      },
      (error: any) => {
        console.error("GPS Error:", error);
      },
      {
        enableHighAccuracy: true, // Use GPS chip, not just cell towers
        distanceFilter: 1, // Update every 1 meter of movement
        interval: 3000, // Check every 3 seconds
        fastestInterval: 2000, // Never faster than every 2 seconds
        forceRequestLocation: true, // Get a location even if phone hasn't moved
      },
    );

    console.log("✅ GPS tracking started. Watch ID:", this.watchId);
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log("GPS tracking stopped.");
    }
  }

  getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position: any) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed ?? 0,
            bearing: position.coords.heading ?? 0,
            timestamp: position.timestamp,
          }),
        (error: any) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }
}

export const locationService = new LocationService();
