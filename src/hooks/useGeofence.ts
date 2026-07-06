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
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const addAlert       = useTrackingStore((state) => state.addAlert);

  // Track last-known status for each member so we don't write to the store
  // unless something actually changed (prevents the infinite loop).
  const lastStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Nothing to do if we don't have our own location yet
    if (!myLocation) return;

    members.forEach((member) => {
      // Skip members who haven't reported a location yet
      if (!member.latitude || !member.longitude) return;

      const distance = calculateDistance(
        member.latitude,
        member.longitude,
        myLocation.latitude,
        myLocation.longitude
      );

      const newStatus = getMemberStatus(distance, radiusMeters);
      const prevStatus = lastStatusRef.current[member.id];

      // ── KEY FIX ─────────────────────────────────────────────────────────────
      // Only write to the store when the status has actually changed.
      // Unconditionally writing on every effect run causes:
      //   members changes → effect re-runs → writes → members changes → …
      // ─────────────────────────────────────────────────────────────────────────
      if (newStatus !== prevStatus) {
        lastStatusRef.current[member.id] = newStatus;
        updateMemberLocation(member.id, { status: newStatus });

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
  }, [members, myLocation, radiusMeters]);
}
