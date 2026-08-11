import { useEffect, useRef, useState } from 'react';
import { alertManager } from '../services/alertManager';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useTrackingStore } from '../store/useTrackingStore';
import { MemberSafetyStatus } from '../types/models';
import { calculateDistance, getMemberStatus } from '../utils/geofence';
import { isDemoMode } from '../utils/isDemoMode';
import { getLocalFixAgeMs, getLocationFreshness } from '../utils/trackingFreshness';

/** Leader-owned, freshness-aware geofence state machine. */
export function useGeofence() {
  const members = useTrackingStore((state) => state.members);
  const myLocation = useTrackingStore((state) => state.myLocation);
  const radiusMeters = useTrackingStore((state) => state.radiusMeters);
  const role = useTrackingStore((state) => state.role);
  const [clockTick, setClockTick] = useState(0);
  const lastStatusRef = useRef<Record<string, MemberSafetyStatus>>({});
  const everOutRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setClockTick((value) => value + 1), 5_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (role !== 'leader' || !myLocation) return;
    const store = useTrackingStore.getState();
    const group = store.group;
    const now = Date.now();

    // A stale leader fix cannot safely classify anybody relative to the leader.
    const leaderFixLive = getLocalFixAgeMs(myLocation.timestamp, now) <= 30_000;

    members.forEach((member) => {
      if (member.id === store.myDeviceId || member.id === 'me') return;
      const previous = lastStatusRef.current[member.id];
      const freshness = getLocationFreshness(member.sourceFixReceivedAt, now);
      let next: MemberSafetyStatus;
      let distance = 0;

      if (!leaderFixLive) {
        next = 'gps_uncertain';
      } else if (member.connectionState === 'disconnected' || freshness === 'offline') {
        next = 'disconnected';
      } else if (freshness !== 'live') {
        next = 'gps_uncertain';
      } else if (
        !Number.isFinite(member.latitude) || !Number.isFinite(member.longitude) ||
        (member.latitude === 0 && member.longitude === 0)
      ) {
        next = 'unknown';
      } else {
        distance = calculateDistance(member.latitude, member.longitude, myLocation.latitude, myLocation.longitude);
        const uncertainty = Math.max(0, myLocation.accuracy || 0) + Math.max(0, member.accuracy || 0);
        next = uncertainty > Math.max(100, radiusMeters * 2)
          ? 'gps_uncertain'
          : getMemberStatus(distance, radiusMeters, uncertainty);
      }

      if (next === previous) return;
      lastStatusRef.current[member.id] = next;
      store.updateMemberLocation(member.id, {
        status: next,
        ...(next === 'out_of_range' ? {
          lastKnownLatitude: member.latitude,
          lastKnownLongitude: member.longitude,
          lastKnownTimestamp: member.sourceFixReceivedAt ?? now,
        } : {}),
      });

      if (next === 'out_of_range') {
        everOutRef.current.add(member.id);
        if (!isDemoMode()) alertManager.triggerOutOfRangeAlert(member.name, distance);
        store.addAlert({
          type: 'out_of_range', memberName: member.name,
          message: `${member.name} is about ${Math.round(distance)}m away and outside the safe zone.`,
        });
        if (group && !isDemoMode()) tcpSocketManager.broadcast({
          type: 'ALERT_OUT_OF_RANGE', groupId: group.id, sessionId: group.sessionId,
          joinToken: group.joinToken, memberId: member.id, memberName: member.name,
          distance, timestamp: now,
        });
      } else if (next === 'safe' && everOutRef.current.has(member.id)) {
        everOutRef.current.delete(member.id);
        if (!isDemoMode()) alertManager.triggerReturnAlert(member.name);
        store.addAlert({ type: 'returned', memberName: member.name, message: `${member.name} returned to the safe zone.` });
      } else if ((next === 'gps_uncertain' || next === 'disconnected') && previous !== undefined) {
        store.addAlert({
          type: next === 'disconnected' ? 'connection_lost' : 'gps_uncertain',
          memberName: member.name,
          message: next === 'disconnected'
            ? `${member.name} is disconnected; the displayed point is last known, not live.`
            : `Location data for ${member.name} or the leader is stale or too uncertain for a boundary decision.`,
        });
      }
    });
  }, [members, myLocation, radiusMeters, role, clockTick]);
}
