// src/hooks/useLocation.ts
import { useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { useTrackingStore } from '../store/useTrackingStore';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useAuthStore } from '../store/useAuthStore';

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

  // Sync location over P2P network — only when actually connected
  useEffect(() => {
    if (!myLocation) return;

    // ✅ BUG FIX: Do NOT try to send/broadcast if not yet connected.
    // This prevents noisy errors and potential crashes when location updates
    // fire before the TCP connection is established.
    if (connectionStatus !== 'connected') return;

    if (role === 'member') {
      // Guard: only send if the TCP client is actually connected
      if (!tcpSocketManager.isClientConnected) return;

      const payload = {
        type: 'LOCATION',
        memberId: myDeviceId,
        memberName: userName,
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        accuracy: myLocation.accuracy,
        bearing: myLocation.bearing,
        speed: myLocation.speed,
        timestamp: myLocation.timestamp || Date.now(),
      };
      tcpSocketManager.send(payload);
    } else if (role === 'leader') {
      // Guard: only broadcast if the TCP server is running
      if (!tcpSocketManager.isServerRunning) return;

      const members = useTrackingStore.getState().members;
      const payload = {
        type: 'GROUP_STATE',
        members: [
          {
            id: myDeviceId,
            name: userName,
            latitude: myLocation.latitude,
            longitude: myLocation.longitude,
            accuracy: myLocation.accuracy,
            status: 'safe' as const,
            lastSeen: myLocation.timestamp || Date.now(),
            isLeader: true,
          },
          ...members,
        ],
      };
      tcpSocketManager.broadcast(payload);
    }
  }, [myLocation, role, userName, connectionStatus, myDeviceId]);

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
