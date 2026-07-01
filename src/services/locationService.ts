// src/services/locationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// STUB — Real implementation will be provided by Member 3 (GPS Engine)
// This file exists so Member 5's hooks compile without Member 3's branch merged.
// ─────────────────────────────────────────────────────────────────────────────

interface LocationData {
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

  private _watchId: any = null;

  /**
   * Start listening for GPS location updates.
   * Real implementation uses expo-location or react-native Geolocation.
   */
  async startTracking(): Promise<void> {
    console.log('[LocationService] STUB: startTracking — waiting for Member 3 implementation');
    // TODO: Member 3 replaces this with real GPS tracking
  }

  /**
   * Stop listening for GPS location updates.
   */
  stopTracking(): void {
    console.log('[LocationService] STUB: stopTracking — waiting for Member 3 implementation');
    if (this._watchId !== null) {
      this._watchId = null;
    }
  }
}

export const locationService = new LocationService();
