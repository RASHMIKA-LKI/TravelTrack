// src/hooks/useGeofence.ts
import { useEffect } from 'react';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';
import { calculateDistance, getMemberStatus } from '../utils/geofence';

/**
 * Watches all member positions against the leader's location and triggers
 * alerts whenever someone goes out of the safe radius or returns.
 *
 * ⚠️  Only the LEADER should mount a component that uses this hook.
 */
export function useGeofence() {
  const members = useTrackingStore((state) => state.members);
  const myLocation = useTrackingStore((state) => state.myLocation);
  const radiusMeters = useTrackingStore((state) => state.radiusMeters);
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const addAlert = useTrackingStore((state) => state.addAlert);

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
      const oldStatus = member.status;

      // Always update the member's computed status in the store
      updateMemberLocation(member.id, { status: newStatus });

      // ── Transitions that trigger alerts ────────────────────────────────────

      // Just went OUT OF RANGE → alert the leader
      if (newStatus === 'out_of_range' && oldStatus !== 'out_of_range') {
        alertManager.triggerOutOfRangeAlert(member.name, distance);
        addAlert({
          type: 'out_of_range',
          memberName: member.name,
          message: `${member.name} is ${Math.round(distance)}m away — out of safe zone`,
        });
      }

      // Just RETURNED to safe zone → celebrate
      if (newStatus === 'safe' && oldStatus === 'out_of_range') {
        alertManager.triggerReturnAlert(member.name);
        addAlert({
          type: 'returned',
          memberName: member.name,
          message: `${member.name} returned to safe zone`,
        });
      }
    });
  }, [members, myLocation, radiusMeters, updateMemberLocation, addAlert]);
}
