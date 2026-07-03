// src/services/locationService.ts
import * as Location from "expo-location";
import { Platform } from "react-native";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  timestamp: number;
}

class LocationService {
  /** Set this callback to receive location updates */
  onLocationUpdate: ((location: LocationData) => void) | null = null;

  private subscription: Location.LocationSubscription | null = null;

  private createFallbackLocation(): LocationData {
    return {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      speed: 0,
      bearing: 0,
      timestamp: Date.now(),
    };
  }

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === "web") {
      return true;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  }

  async startTracking(): Promise<void> {
    const hasPermission = await this.requestPermission();

    if (!hasPermission) {
      console.warn("[LocationService] Location permission denied");
      return;
    }

    if (this.subscription) {
      return;
    }

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 1,
      },
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? 0,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          timestamp: position.timestamp,
        };

        if (this.onLocationUpdate) {
          this.onLocationUpdate(location);
        }
      },
    );
  }

  stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    const hasPermission = await this.requestPermission();

    if (!hasPermission) {
      console.warn(
        "[LocationService] Location permission not granted, using fallback coordinates",
      );
      return this.createFallbackLocation();
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? 0,
        speed: position.coords.speed ?? 0,
        bearing: position.coords.heading ?? 0,
        timestamp: position.timestamp,
      };
    } catch (error) {
      console.warn(
        "[LocationService] Failed to get current location, using fallback coordinates",
        error,
      );
      return this.createFallbackLocation();
    }
  }
}

export const locationService = new LocationService();
