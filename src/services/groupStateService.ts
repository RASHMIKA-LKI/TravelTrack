import { useAuthStore } from '../store/useAuthStore';
import { useTrackingStore } from '../store/useTrackingStore';
import { Member } from '../types/models';
import { getLocalFixAgeMs, getLocationAgeMs } from '../utils/trackingFreshness';
import { tcpSocketManager } from './tcpSocketManager';

function toWireMember(member: Member, now: number) {
  return {
    id: member.id,
    name: member.name,
    latitude: member.latitude,
    longitude: member.longitude,
    accuracy: member.accuracy,
    batteryLevel: member.batteryLevel,
    status: member.status,
    isLeader: member.isLeader,
    connectionState: member.connectionState ?? 'connected',
    locationSequence: member.locationSequence ?? 0,
    locationAgeMs: getLocationAgeMs(member.sourceFixReceivedAt, now),
  };
}

/** Relay GPS age, never a sender wall-clock timestamp, so clock skew cannot make stale data live. */
export function buildCurrentGroupState() {
  const state = useTrackingStore.getState();
  const group = state.group;
  if (!group) return null;
  const now = Date.now();
  const user = useAuthStore.getState().user;
  const leaderName = user?.displayName || user?.email?.split('@')[0] || 'Group Leader';
  const leader = state.myLocation
    ? [{
        id: state.myDeviceId,
        name: leaderName,
        latitude: state.myLocation.latitude,
        longitude: state.myLocation.longitude,
        accuracy: state.myLocation.accuracy,
        status: 'safe' as const,
        isLeader: true,
        connectionState: 'connected' as const,
        locationSequence: state.locationSequence,
        locationAgeMs: getLocalFixAgeMs(state.myLocation.timestamp, now),
      }]
    : [];

  return {
    type: 'GROUP_STATE',
    groupId: group.id,
    sessionId: group.sessionId,
    joinToken: group.joinToken,
    members: [...leader, ...state.members.map((member) => toWireMember(member, now))],
    timestamp: now,
  };
}

export function broadcastCurrentGroupState(): number {
  const payload = buildCurrentGroupState();
  return payload ? tcpSocketManager.broadcast(payload) : 0;
}
