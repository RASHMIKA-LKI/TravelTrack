// src/hooks/useGeofence.ts
import { useEffect, useRef } from 'react';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';
import { calculateDistance, getMemberStatus } from '../utils/geofence';
import { isDemoMode } from '../utils/isDemoMode';

/**
 * Watches all member positions against the leader's location and triggers
 * alerts whenever someone goes out of the safe radius or returns.
 *
 * ⚠️  Only call this hook on the TrackingScreen.
 *
 * THE INFINITE LOOP BUG (now fixed):
 * ────────────────────────────────────
 * The previous version called `updateMemberLocation()` unconditionally on
 * every effect run. Since `members` was a dependency, that write → re-render
 * → re-run → write → … caused "Maximum update depth exceeded".
 *
 * Fix: only write to the store when the status has actually changed.
 * We track the last-known status of each member in a ref so we never
 * re-render unnecessarily.
 */
export function useGeofence() {
  const members        = useTrackingStore((state) => state.members);
  const myLocation     = useTrackingStore((state) => state.myLocation);
  const radiusMeters   = useTrackingStore((state) => state.radiusMeters);
  const role           = useTrackingStore((state) => state.role);
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const addAlert       = useTrackingStore((state) => state.addAlert);

  // Track last-known status for each member so we don't write to the store
  // unless something actually changed (prevents the infinite loop).
  const lastStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // The leader owns radius decisions. Members receive a targeted alert from
    // the leader; otherwise every phone could independently flag the leader.
    if (role !== 'leader' || !myLocation) return;

    const myDeviceId = useTrackingStore.getState().myDeviceId;

    members.forEach((member) => {
      // Skip checking yourself (don't perform geofence alerts on your own device)
      if (member.id === myDeviceId || member.id === 'me') return;

      // Skip members who haven't reported a valid GPS location yet (0,0 or missing)
      if (!Number.isFinite(member.latitude) || !Number.isFinite(member.longitude) || (member.latitude === 0 && member.longitude === 0)) return;

      const distance = calculateDistance(
        member.latitude,
        member.longitude,
        myLocation.latitude,
        myLocation.longitude
      );

      const uncertainty = Math.max(0, myLocation.accuracy || 0) + Math.max(0, member.accuracy || 0);
      const newStatus = getMemberStatus(distance, radiusMeters, uncertainty);
      const prevStatus = lastStatusRef.current[member.id];

      // ── KEY FIX ─────────────────────────────────────────────────────────────
      // Only write to the store when the status has actually changed.
      // Unconditionally writing on every effect run causes:
      //   members changes → effect re-runs → writes → members changes → …
      // ─────────────────────────────────────────────────────────────────────────
      if (newStatus !== prevStatus) {
        lastStatusRef.current[member.id] = newStatus;

        // If transitioning to out_of_range, save current location as lastKnown location
        const locationUpdate: any = { status: newStatus };
        if (newStatus === 'out_of_range') {
          locationUpdate.lastKnownLatitude = member.latitude;
          locationUpdate.lastKnownLongitude = member.longitude;
          locationUpdate.lastKnownTimestamp = Date.now();
        }

        updateMemberLocation(member.id, locationUpdate);

        // Just went OUT OF RANGE
        if (newStatus === 'out_of_range' && prevStatus !== undefined) {
          // Only alert on first time out — not on initial mount
          if (isDemoMode()) {
            // In demo mode skip vibration but still add to alert log
            addAlert({
              type: 'out_of_range',
              memberName: member.name,
              message: `${member.name} is ${Math.round(distance)}m away — out of safe zone`,
            });
          } else {
            alertManager.triggerOutOfRangeAlert(member.name, distance);
            addAlert({
              type: 'out_of_range',
              memberName: member.name,
              message: `${member.name} is ${Math.round(distance)}m away — out of safe zone`,
            });

            // Broadcast ALERT_OUT_OF_RANGE over TCP so member device vibrates & alerts member
            try {
              const { tcpSocketManager } = require('../services/tcpSocketManager');
              if (tcpSocketManager && tcpSocketManager.broadcast) {
                tcpSocketManager.broadcast({
                  type: 'ALERT_OUT_OF_RANGE',
                  memberId: member.id,
                  memberName: member.name,
                  distance,
                  timestamp: Date.now(),
                });
              }
            } catch (e) {
              console.warn('Failed to broadcast out-of-range alert over TCP:', e);
            }
          }
        }

        // Just RETURNED to safe zone
        if (newStatus === 'safe' && prevStatus === 'out_of_range') {
          if (isDemoMode()) {
            addAlert({
              type: 'returned',
              memberName: member.name,
              message: `${member.name} returned to safe zone ✅`,
            });
          } else {
            alertManager.triggerReturnAlert(member.name);
            addAlert({
              type: 'returned',
              memberName: member.name,
              message: `${member.name} returned to safe zone ✅`,
            });
          }
        }
      }
    });
  // ⚠️  Do NOT include updateMemberLocation or addAlert in deps —
  // Zustand actions are stable references but including them caused a secondary
  // re-render path. members and myLocation are the only real triggers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, myLocation, radiusMeters, role]);
}
