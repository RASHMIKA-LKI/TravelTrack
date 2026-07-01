// src/hooks/useLocation.ts
import { useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { useTrackingStore } from '../store/useTrackingStore';

/**
 * Use this hook in any screen to access the current user's GPS location.
 * It automatically starts listening for location updates and stores them
 * in the global tracking store so all screens can read them.
 */
export function useLocation() {
  const setMyLocation = useTrackingStore((state) => state.setMyLocation);
  const myLocation = useTrackingStore((state) => state.myLocation);

  useEffect(() => {
    // When this hook is first mounted, start listening for location updates
    locationService.onLocationUpdate = (location) => {
      setMyLocation(location);
    };

    return () => {
      // Clean up when the component unmounts — stop receiving updates
      locationService.onLocationUpdate = null;
    };
  }, [setMyLocation]);

  /** Call this to start GPS tracking */
  const startTracking = useCallback(async () => {
    await locationService.startTracking();
  }, []);

  /** Call this to stop GPS tracking */
  const stopTracking = useCallback(() => {
    locationService.stopTracking();
  }, []);

  return {
    myLocation,    // Current GPS position (or null if not yet acquired)
    startTracking, // Call this to start GPS
    stopTracking,  // Call this to stop GPS
  };
}
