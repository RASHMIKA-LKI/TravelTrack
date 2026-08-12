import { useCallback } from 'react';
import { alertManager } from '../services/alertManager';
import { broadcastCurrentGroupState } from '../services/groupStateService';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { useAuthStore } from '../store/useAuthStore';
import { useTrackingStore } from '../store/useTrackingStore';
import { GroupInvitation } from '../types/models';
import type { MemberSafetyStatus } from '../types/models';
import {
  isValidLocationPayload,
  payloadMatchesGroup,
  sanitizeTransportText,
} from '../utils/sessionProtocol';
import { reconstructSourceFixTime } from '../utils/trackingFreshness';

const HANDSHAKE_TIMEOUT_MS = 25_000;
const seenSOSEvents = new Set<string>();
const allowedStatuses = new Set<MemberSafetyStatus>([
  'unknown', 'safe', 'warning', 'out_of_range', 'gps_uncertain', 'disconnected', 'sos',
]);

function safeWireStatus(value: unknown): MemberSafetyStatus {
  return allowedStatuses.has(value as MemberSafetyStatus) ? value as MemberSafetyStatus : 'unknown';
}

let pendingHandshake: {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
} | null = null;

function rejectPendingHandshake(message: string) {
  if (!pendingHandshake) return;
  clearTimeout(pendingHandshake.timer);
  pendingHandshake.reject(new Error(message));
  pendingHandshake = null;
}

function resolvePendingHandshake() {
  if (!pendingHandshake) return;
  clearTimeout(pendingHandshake.timer);
  pendingHandshake.resolve();
  pendingHandshake = null;
}

function invitationMatches(payload: any, invitation: GroupInvitation | null): boolean {
  return Boolean(
    invitation &&
    payload?.groupId === invitation.groupId &&
    payload?.sessionId === invitation.sessionId &&
    payload?.joinToken === invitation.joinToken
  );
}

export function installMemberMessageHandler() {
  tcpSocketManager.onClientConnectionChanged = (connected) => {
    const state = useTrackingStore.getState();
    if (state.role !== 'member') return;
    state.setConnectionStatus(connected
      ? state.connectionStatus === 'reconnecting' ? 'reconnecting' : 'connecting'
      : state.isTracking ? 'degraded' : 'disconnected');
  };

  tcpSocketManager.onMessageReceived = (payload) => {
    const state = useTrackingStore.getState();

    if (payload?.type === 'REJECT') {
      state.setConnectionStatus('disconnected');
      rejectPendingHandshake(sanitizeTransportText(payload.reason, 'The leader rejected this invitation.'));
      return;
    }

    if (payload?.type === 'WELCOME') {
      if (!invitationMatches(payload, state.pendingInvitation)) {
        rejectPendingHandshake('The leader response did not match the scanned invitation.');
        tcpSocketManager.disconnect();
        return;
      }
      const invitation = state.pendingInvitation!;
      state.setGroup({
        id: invitation.groupId,
        name: sanitizeTransportText(payload.groupName, invitation.groupName),
        leaderId: sanitizeTransportText(payload.leaderId, 'leader'),
        radiusMeters: Number.isFinite(payload.radiusMeters) ? Math.max(10, Math.min(5_000, payload.radiusMeters)) : 50,
        createdAt: Number.isFinite(payload.createdAt) ? payload.createdAt : Date.now(),
        sessionId: invitation.sessionId,
        joinToken: invitation.joinToken,
        leaderDeviceAddress: state.lastLeaderDeviceAddress ?? undefined,
        leaderIp: state.lastLeaderIp ?? undefined,
      });
      state.setRole('member');
      state.setRadius(Number.isFinite(payload.radiusMeters) ? payload.radiusMeters : 50);
      state.setConnectionStatus('connected');
      resolvePendingHandshake();
      return;
    }

    if (!payloadMatchesGroup(payload, state.group)) return;

    if (payload.type === 'GROUP_STATE' && Array.isArray(payload.members)) {
      const now = Date.now();
      payload.members.slice(0, 200).forEach((wire: any) => {
        if (wire?.id === state.myDeviceId || typeof wire?.id !== 'string') return;
        if (!Number.isFinite(wire.latitude) || !Number.isFinite(wire.longitude)) return;
        const memberId = sanitizeTransportText(wire.id, '', 256);
        if (!memberId) return;
        const existing = useTrackingStore.getState().members.find((member) => member.id === memberId);
        const sequence = Number.isInteger(wire.locationSequence) ? wire.locationSequence : 0;
        if (existing && sequence < (existing.locationSequence ?? 0)) return;
        const patch = {
          id: memberId,
          name: sanitizeTransportText(wire.name, 'Group member'),
          latitude: wire.latitude,
          longitude: wire.longitude,
          accuracy: Number.isFinite(wire.accuracy) ? wire.accuracy : undefined,
          batteryLevel: Number.isFinite(wire.batteryLevel) ? wire.batteryLevel : undefined,
          status: wire.connectionState === 'disconnected' ? 'disconnected' as const : safeWireStatus(wire.status),
          isLeader: Boolean(wire.isLeader),
          lastSeen: now,
          lastPacketReceivedAt: now,
          lastReceivedAt: now,
          lastLocationReceivedAt: now,
          sourceFixReceivedAt: reconstructSourceFixTime(wire.locationAgeMs, now),
          locationSequence: sequence,
          connectionState: wire.connectionState ?? 'connected',
        };
        existing ? state.updateMemberLocation(memberId, patch) : state.addMember(patch);
      });
      return;
    }

    if (payload.type === 'START_TRACKING') {
      state.setIsTracking(true);
    } else if (payload.type === 'END_GROUP') {
      tcpSocketManager.disconnect();
      void wifiDirectManager.leaveGroup();
      state.resetTracking();
    } else if (payload.type === 'ALERT_OUT_OF_RANGE' && payload.memberId === state.myDeviceId) {
      const distance = Number.isFinite(payload.distance) ? payload.distance : 0;
      alertManager.triggerOutOfRangeAlert('You', distance);
      state.addAlert({
        type: 'out_of_range',
        memberName: 'Group Leader',
        message: `You are about ${Math.round(distance)}m away and outside the safe radius.`,
      });
    } else if (payload.type === 'SOS' && typeof payload.eventId === 'string') {
      if (!seenSOSEvents.has(payload.eventId)) {
        seenSOSEvents.add(payload.eventId);
        const name = sanitizeTransportText(payload.memberName, 'Group member');
        state.triggerSOS(name);
        alertManager.triggerSOSAlert(name, payload.latitude ?? 0, payload.longitude ?? 0);
      }
      tcpSocketManager.send({
        type: 'SOS_ACK', groupId: state.group!.id, sessionId: state.group!.sessionId,
        joinToken: state.group!.joinToken, eventId: payload.eventId,
        recipientId: state.myDeviceId, timestamp: Date.now(),
      });
    } else if (payload.type === 'SOS_ACK') {
      state.acknowledgeSOS(payload.eventId, payload.recipientId);
    } else if (payload.type === 'CHAT' && payload.memberId !== state.myDeviceId) {
      state.addMessage({
        senderId: sanitizeTransportText(payload.memberId, 'unknown'),
        senderName: sanitizeTransportText(payload.memberName, 'Group member'),
        text: sanitizeTransportText(payload.message, '', 2_000),
      });
    } else if (payload.type === 'MEETUP_POINT') {
      if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return;
      const setBy = sanitizeTransportText(payload.setBy, 'Group member');
      state.setMeetupPoint({
        name: sanitizeTransportText(payload.name, 'Meetup point'),
        latitude: payload.latitude,
        longitude: payload.longitude,
        setBy,
        timestamp: Date.now(),
      });
      state.addAlert({ type: 'meetup', memberName: setBy, message: `${setBy} set a meetup point.` });
    }
  };
}

export function useWifiDirect() {
  const setConnectionStatus = useTrackingStore((state) => state.setConnectionStatus);

  const setupLeaderMessageHandler = useCallback(() => {
    tcpSocketManager.onMemberDisconnected = (memberId) => {
      if (!memberId) return;
      const state = useTrackingStore.getState();
      const member = state.members.find((candidate) => candidate.id === memberId);
      state.markMemberConnection(memberId, 'disconnected');
      state.addAlert({
        type: 'connection_lost',
        memberName: member?.name ?? 'Group member',
        message: `${member?.name ?? 'A group member'} disconnected. Their last GPS point is retained but is not live.`,
      });
      broadcastCurrentGroupState();
    };

    tcpSocketManager.onMessageReceived = (payload, socketId) => {
      const state = useTrackingStore.getState();
      const group = state.group;
      if (!group || socketId === undefined) return;

      if (payload?.type === 'JOIN') {
        if (!payloadMatchesGroup(payload, group)) {
          tcpSocketManager.sendToSocket(socketId, { type: 'REJECT', reason: 'Invitation is invalid or expired for this group session.' });
          return;
        }
        const memberId = sanitizeTransportText(payload.memberId, '', 256);
        if (!memberId) return;
        if (tcpSocketManager.isMemberAssociated(memberId, socketId)) {
          console.log(`[Leader] Member ${memberId} rejoining on new socket ${socketId}. Updating socket association.`);
        }
        const now = Date.now();
        tcpSocketManager.associateSocket(socketId, memberId);
        const existing = state.members.find((member) => member.id === memberId);
        const patch = {
          id: memberId,
          name: sanitizeTransportText(payload.memberName, 'Guest member'),
          latitude: existing?.latitude ?? 0,
          longitude: existing?.longitude ?? 0,
          status: existing?.status === 'disconnected' ? 'unknown' as const : existing?.status ?? 'unknown' as const,
          lastSeen: existing?.lastSeen ?? now,
          lastPacketReceivedAt: now,
          lastReceivedAt: now,
          connectionState: 'connected' as const,
        };
        existing ? state.updateMemberLocation(memberId, patch) : state.addMember(patch);
        tcpSocketManager.sendToSocket(socketId, {
          type: 'WELCOME', groupId: group.id, sessionId: group.sessionId, joinToken: group.joinToken,
          groupName: group.name, leaderId: group.leaderId, radiusMeters: group.radiusMeters,
          createdAt: group.createdAt,
        });
        broadcastCurrentGroupState();
        return;
      }

      if (!payloadMatchesGroup(payload, group)) return;
      const associatedMemberId = tcpSocketManager.getMemberIdForSocket(socketId);
      if (!associatedMemberId) return;

      if (payload.type === 'LOCATION') {
        if (!isValidLocationPayload(payload) || payload.memberId !== associatedMemberId) return;
        const existing = state.members.find((member) => member.id === associatedMemberId);
        if (existing && payload.sequence <= (existing.locationSequence ?? -1)) return;
        const now = Date.now();
        const patch = {
          id: associatedMemberId,
          name: sanitizeTransportText(payload.memberName, existing?.name ?? 'Group member'),
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          bearingDegrees: Number.isFinite(payload.bearing) ? payload.bearing : undefined,
          batteryLevel: Number.isFinite(payload.batteryLevel) ? payload.batteryLevel : undefined,
          status: existing?.status === 'disconnected' ? 'unknown' as const : existing?.status ?? 'unknown' as const,
          lastSeen: now,
          lastPacketReceivedAt: now,
          lastReceivedAt: now,
          lastLocationReceivedAt: now,
          sourceFixReceivedAt: reconstructSourceFixTime(payload.fixAgeMs, now),
          locationSequence: payload.sequence,
          connectionState: 'connected' as const,
        };
        existing ? state.updateMemberLocation(associatedMemberId, patch) : state.addMember(patch);
        broadcastCurrentGroupState();
      } else if (payload.type === 'SOS' && payload.memberId === associatedMemberId && typeof payload.eventId === 'string') {
        if (!seenSOSEvents.has(payload.eventId)) {
          seenSOSEvents.add(payload.eventId);
          const name = sanitizeTransportText(payload.memberName, 'Group member');
          state.triggerSOS(name);
          alertManager.triggerSOSAlert(name, payload.latitude ?? 0, payload.longitude ?? 0);
          tcpSocketManager.broadcast(payload);
        }
        tcpSocketManager.sendToSocket(socketId, {
          type: 'SOS_ACK', groupId: group.id, sessionId: group.sessionId, joinToken: group.joinToken,
          eventId: payload.eventId, recipientId: state.myDeviceId, timestamp: Date.now(),
        });
      } else if (payload.type === 'SOS_ACK') {
        state.acknowledgeSOS(payload.eventId, payload.recipientId);
        tcpSocketManager.broadcast(payload);
      } else if (payload.type === 'CHAT' && payload.memberId === associatedMemberId) {
        const text = sanitizeTransportText(payload.message, '', 2_000);
        if (!text) return;
        state.addMessage({ senderId: associatedMemberId, senderName: sanitizeTransportText(payload.memberName, 'Group member'), text });
        tcpSocketManager.broadcast({ ...payload, message: text });
      } else if (payload.type === 'MEETUP_POINT') {
        if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return;
        const setBy = sanitizeTransportText(payload.setBy, 'Group member');
        state.setMeetupPoint({ name: sanitizeTransportText(payload.name, 'Meetup point'), latitude: payload.latitude, longitude: payload.longitude, setBy, timestamp: Date.now() });
        state.addAlert({ type: 'meetup', memberName: setBy, message: `${setBy} set a meetup point.` });
        tcpSocketManager.broadcast(payload);
      }
    };
  }, []);

  const startHosting = useCallback(async () => {
    setConnectionStatus('connecting');
    if (!useTrackingStore.getState().group) throw new Error('Create the group session before starting the host.');
    try {
      tcpSocketManager.stopServer();
      setupLeaderMessageHandler();
      await tcpSocketManager.startServer();
      await wifiDirectManager.startHosting();
      const creds = await wifiDirectManager.getGroupCredentials();
      if (creds) {
        const currentGroup = useTrackingStore.getState().group;
        if (currentGroup) {
          useTrackingStore.getState().setGroup({
            ...currentGroup,
            networkName: creds.networkName,
            passphrase: creds.passphrase,
          });
        }
      }
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
      tcpSocketManager.stopServer();
      throw error;
    }
  }, [setConnectionStatus, setupLeaderMessageHandler]);

  const startScanning = useCallback(async (onPeersFound: (peers: any[]) => void) => {
    setConnectionStatus('scanning');
    try { await wifiDirectManager.startScanning(onPeersFound); }
    catch (error) { setConnectionStatus('disconnected'); throw error; }
  }, [setConnectionStatus]);

  const connectToLeader = useCallback(async (deviceAddress: string, invitation: GroupInvitation) => {
    if (invitation.expiresAt <= Date.now()) throw new Error('The invitation expired. Scan a new QR code from the leader.');
    setConnectionStatus('connecting');
    const state = useTrackingStore.getState();
    state.setPendingInvitation(invitation);
    state.setLeaderConnection(deviceAddress, null);
    try {
      const leaderIp = await wifiDirectManager.connectToLeader(deviceAddress);
      state.setLeaderConnection(deviceAddress, leaderIp);
      installMemberMessageHandler();
      tcpSocketManager.disconnect();
      await tcpSocketManager.connectToServer(leaderIp);
      const user = useAuthStore.getState().user;
      const memberName = user?.displayName || user?.email?.split('@')[0] || `Guest ${state.myDeviceId.slice(-4)}`;
      const handshake = new Promise<void>((resolve, reject) => {
        pendingHandshake = {
          resolve,
          reject,
          timer: setTimeout(() => rejectPendingHandshake('The leader did not confirm this group within 10 seconds.'), HANDSHAKE_TIMEOUT_MS),
        };
      });
      if (!tcpSocketManager.send({
        type: 'JOIN', groupId: invitation.groupId, sessionId: invitation.sessionId,
        joinToken: invitation.joinToken, memberId: state.myDeviceId,
        memberName, timestamp: Date.now(),
      })) rejectPendingHandshake('The TCP connection closed before the join request was sent.');
      await handshake;
    } catch (error) {
      rejectPendingHandshake('Group connection failed.');
      setConnectionStatus('disconnected');
      tcpSocketManager.disconnect();
      throw error;
    }
  }, [setConnectionStatus]);

  const connectToLeaderByCredentials = useCallback(async (invitation: GroupInvitation) => {
    if (invitation.expiresAt <= Date.now()) throw new Error('The invitation expired. Scan a new QR code from the leader.');
    if (!invitation.networkName) throw new Error('Invitation is missing group credentials.');
    setConnectionStatus('connecting');
    const state = useTrackingStore.getState();
    state.setPendingInvitation(invitation);
    try {
      const leaderIp = await wifiDirectManager.connectByCredentials(invitation.networkName, invitation.passphrase || '');
      state.setLeaderConnection('CREDENTIAL_JOIN', leaderIp);
      installMemberMessageHandler();
      tcpSocketManager.disconnect();
      await tcpSocketManager.connectToServer(leaderIp);
      const user = useAuthStore.getState().user;
      const memberName = user?.displayName || user?.email?.split('@')[0] || `Guest ${state.myDeviceId.slice(-4)}`;
      const handshake = new Promise<void>((resolve, reject) => {
        pendingHandshake = {
          resolve,
          reject,
          timer: setTimeout(() => rejectPendingHandshake('The leader did not confirm this group within 10 seconds.'), HANDSHAKE_TIMEOUT_MS),
        };
      });
      if (!tcpSocketManager.send({
        type: 'JOIN', groupId: invitation.groupId, sessionId: invitation.sessionId,
        joinToken: invitation.joinToken, memberId: state.myDeviceId,
        memberName, timestamp: Date.now(),
      })) rejectPendingHandshake('The TCP connection closed before the join request was sent.');
      await handshake;
    } catch (error) {
      rejectPendingHandshake('Group connection failed.');
      setConnectionStatus('disconnected');
      tcpSocketManager.disconnect();
      throw error;
    }
  }, [setConnectionStatus]);

  return { startHosting, startScanning, connectToLeader, connectToLeaderByCredentials };
}
