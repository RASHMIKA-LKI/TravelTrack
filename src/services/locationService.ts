// src/services/locationService.ts
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid } from 'react-native';
import { LOCATION_SYNC_INTERVAL_MS, LOCATION_FASTEST_INTERVAL_MS } from '../utils/constants';
import { startForegroundTracking, stopForegroundTracking } from './foregroundTrackingService';

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

  /** Ask the user for location permission */
  async requestPermission(): Promise<boolean> {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'TravelTrack needs Location',
        message: 'We need your location to track group members and alert you if someone goes out of range.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  /** Start tracking GPS — updates every 5 seconds */
  async startTracking(): Promise<void> {
    if (this.watchId !== null) return;
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Location permission was denied. Tracking did not start.');
    }

    await startForegroundTracking();

    // Fetch immediate single GPS fix so myLocation is available instantly
    try {
      const immediate = await this.getCurrentLocation();
      if (this.onLocationUpdate) {
        this.onLocationUpdate(immediate);
      }
    } catch (e) {
      console.warn('Initial location fix pending:', e);
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          timestamp: position.timestamp,
        };
        
        console.log('📍 Location update:', location.latitude, location.longitude);
        
        if (this.onLocationUpdate) {
          this.onLocationUpdate(location);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
      },
      {
        enableHighAccuracy: true,          // Use GPS chip, not just cell towers
        distanceFilter: 1,                 // Update every 1 meter of movement
        interval: LOCATION_SYNC_INTERVAL_MS,       // Check every 5 seconds
        fastestInterval: LOCATION_FASTEST_INTERVAL_MS, // Never faster than every 3 seconds
        forceRequestLocation: true,        // Get a location even if phone hasn't moved
      }
    );
    
    console.log('✅ GPS tracking started. Watch ID:', this.watchId);
  }

  /** Stop tracking GPS */
  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('GPS tracking stopped.');
    }
    void stopForegroundTracking().catch((error) => console.warn('Could not stop foreground tracking service:', error));
  }

  /** Get ONE location reading right now */
  getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          timestamp: position.timestamp,
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}

export const locationService = new LocationService();
