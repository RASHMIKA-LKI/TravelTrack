// src/hooks/useLocation.ts
import { useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { useTrackingStore } from '../store/useTrackingStore';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useAuthStore } from '../store/useAuthStore';
import { broadcastCurrentGroupState } from '../services/groupStateService';
import { getLocalFixAgeMs } from '../utils/trackingFreshness';

/**
 * Use this hook in any screen to access the current user's GPS location.
 * It automatically starts listening for location updates and stores them
 * in the global tracking store so all screens can read them.
 */
export function useLocation() {
  const setMyLocation = useTrackingStore((state) => state.setMyLocation);
  const myLocation = useTrackingStore((state) => state.myLocation);
  const role = useTrackingStore((state) => state.role);
  const connectionStatus = useTrackingStore((state) => state.connectionStatus);
  const { user } = useAuthStore();
  const myDeviceId = useTrackingStore((state) => state.myDeviceId);
  const guestDefault = `Guest ${myDeviceId.slice(-4).toUpperCase()}`;
  const userName = user?.displayName || user?.email?.split('@')[0] || guestDefault;

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

  // Sync location over P2P network — when connected or on periodic 5s heartbeat
  const sendLocationSync = useCallback(() => {
    const state = useTrackingStore.getState();
    const loc = state.myLocation;
    const group = state.group;
    if (!loc || !group || state.connectionStatus !== 'connected') return;

    if (role === 'member') {
      if (!tcpSocketManager.isClientConnected) return;

      const payload = {
        type: 'LOCATION',
        groupId: group.id,
        sessionId: group.sessionId,
        joinToken: group.joinToken,
        memberId: myDeviceId,
        memberName: userName,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        bearing: loc.bearing,
        speed: loc.speed,
        sequence: state.nextLocationSequence(),
        fixAgeMs: getLocalFixAgeMs(loc.timestamp),
        timestamp: Date.now(),
      };
      tcpSocketManager.send(payload);
    } else if (role === 'leader') {
      if (!tcpSocketManager.isServerRunning) return;

      state.nextLocationSequence();
      broadcastCurrentGroupState();
    }
  }, [role, myDeviceId, userName]);

  useEffect(() => {
    sendLocationSync();
  }, [myLocation, sendLocationSync]);

  // Outbound 5-second heartbeat so stationary members do not become stale
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const intervalId = setInterval(() => {
      sendLocationSync();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [connectionStatus, sendLocationSync]);

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
