import { useAuthStore } from '../store/useAuthStore';
import { useTrackingStore } from '../store/useTrackingStore';
import { getLocalFixAgeMs } from '../utils/trackingFreshness';
import { tcpSocketManager } from './tcpSocketManager';

export interface SOSSendResult {
  eventId: string;
  sent: boolean;
  message: string;
}

export function sendSOS(): SOSSendResult {
  const state = useTrackingStore.getState();
  const group = state.group;
  const location = state.myLocation;
  const eventId = `sos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  if (!group) return { eventId, sent: false, message: 'No active group session.' };

  const user = useAuthStore.getState().user;
  const memberName = user?.displayName || user?.email?.split('@')[0] || `Guest ${state.myDeviceId.slice(-4)}`;
  const payload = {
    type: 'SOS',
    groupId: group.id,
    sessionId: group.sessionId,
    joinToken: group.joinToken,
    eventId,
    memberId: state.myDeviceId,
    memberName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    accuracy: location?.accuracy,
    locationAgeMs: location ? getLocalFixAgeMs(location.timestamp) : undefined,
    message: location ? 'Emergency alert with last known location.' : 'Emergency alert; GPS location unavailable.',
    timestamp: Date.now(),
  };

  state.addPendingSOS({
    eventId,
    status: 'pending',
    acknowledgedBy: [],
    createdAt: Date.now(),
    locationIncluded: Boolean(location),
  });

  const sent = state.role === 'leader'
    ? tcpSocketManager.broadcast(payload) > 0
    : tcpSocketManager.send(payload);

  if (!sent) {
    state.failSOS(eventId, 'No live offline connection to another group device.');
    return { eventId, sent: false, message: 'Not delivered: no connected group device.' };
  }

  state.addPendingSOS({
    eventId,
    status: 'sent_to_leader',
    acknowledgedBy: [],
    createdAt: Date.now(),
    locationIncluded: Boolean(location),
  });
  return {
    eventId,
    sent: true,
    message: location ? 'Sent; waiting for a device acknowledgement.' : 'Sent without GPS; waiting for acknowledgement.',
  };
}
