// src/hooks/useWifiDirect.ts
import { useCallback } from 'react';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';
import { useAuthStore } from '../store/useAuthStore';

export function useWifiDirect() {
  const setConnectionStatus = useTrackingStore((state) => state.setConnectionStatus);
  const addMember = useTrackingStore((state) => state.addMember);
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const triggerSOS = useTrackingStore((state) => state.triggerSOS);
  const addMessage = useTrackingStore((state) => state.addMessage);
  const setIsTracking = useTrackingStore((state) => state.setIsTracking);

  const broadcastGroupState = useCallback(() => {
    const state = useTrackingStore.getState();
    const leader = useAuthStore.getState().user;
    const leaderName = leader?.displayName || leader?.email?.split('@')[0] || 'Group Leader';
    const leaderMember = state.myLocation
      ? [{
          id: state.myDeviceId,
          name: leaderName,
          latitude: state.myLocation.latitude,
          longitude: state.myLocation.longitude,
          accuracy: state.myLocation.accuracy,
          status: 'safe' as const,
          lastSeen: state.myLocation.timestamp || Date.now(),
          isLeader: true,
        }]
      : [];
    tcpSocketManager.broadcast({ type: 'GROUP_STATE', members: [...leaderMember, ...state.members] });
  }, []);

  // ───────────────────────────────────────────────────────────────────
  // Shared message handler for the LEADER's TCP server
  // ───────────────────────────────────────────────────────────────────
  const setupLeaderMessageHandler = useCallback(() => {
    tcpSocketManager.onMessageReceived = (payload) => {
      if (payload.type === 'JOIN') {
        const exists = useTrackingStore.getState().members.some((m) => m.id === payload.memberId);
        if (!exists) {
          addMember({
            id: payload.memberId,
            name: payload.memberName || 'Member',
            latitude: 0,
            longitude: 0,
            status: 'safe',
            lastSeen: payload.timestamp || Date.now(),
          });
        }
        // The lobby must reflect a successful TCP handshake immediately;
        // location updates only begin after tracking starts.
        broadcastGroupState();
      } else if (payload.type === 'LOCATION') {
        const exists = useTrackingStore
          .getState()
          .members.some((m) => m.id === payload.memberId);

        if (!exists) {
          addMember({
            id: payload.memberId,
            name: payload.memberName,
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy: payload.accuracy,
            batteryLevel: payload.batteryLevel,
            status: 'safe',
            lastSeen: payload.timestamp,
          });
        } else {
          updateMemberLocation(payload.memberId, {
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy: payload.accuracy,
            batteryLevel: payload.batteryLevel,
            lastSeen: payload.timestamp,
          });
        }

        broadcastGroupState();
      } else if (payload.type === 'SOS') {
        triggerSOS(payload.memberName);
        alertManager.triggerSOSAlert(
          payload.memberName,
          payload.latitude,
          payload.longitude
        );
        // ✅ BUG FIX: Re-broadcast SOS to all other members so everyone gets it
        tcpSocketManager.broadcast(payload);
      } else if (payload.type === 'CHAT') {
        // Add to leader's local messages (shows on the left since senderId != leader's myDeviceId)
        addMessage({
          senderId: payload.memberId,
          senderName: payload.memberName,
          text: payload.message,
        });
        // ✅ BUG FIX: Relay chat to all connected members so everyone sees it
        tcpSocketManager.broadcast(payload);
      } else if (payload.type === 'MEETUP_POINT') {
        // ✅ Handle meetup point from member
        const { setMeetupPoint, addAlert } = useTrackingStore.getState();
        setMeetupPoint({
          name: payload.name,
          latitude: payload.latitude,
          longitude: payload.longitude,
          setBy: payload.setBy,
          timestamp: Date.now(),
        });
        addAlert({
          type: 'meetup',
          memberName: payload.setBy,
          message: `${payload.setBy} set meetup point: "${payload.name}"`,
        });
        alertManager.triggerReturnAlert(payload.setBy); // Short vibration notification
        // Broadcast to all members
        tcpSocketManager.broadcast(payload);
      }
    };
  }, [addMember, updateMemberLocation, triggerSOS, addMessage, broadcastGroupState]);

  // ───────────────────────────────────────────────────────────────────
  // Shared message handler for the MEMBER's TCP client
  // ───────────────────────────────────────────────────────────────────
  const setupMemberMessageHandler = useCallback(() => {
    tcpSocketManager.onMessageReceived = (payload) => {
      if (payload.type === 'GROUP_STATE') {
        payload.members?.forEach((m: any) => {
          const exists = useTrackingStore
            .getState()
            .members.some((existing) => existing.id === m.id);
          if (exists) {
            updateMemberLocation(m.id, m);
          } else {
            addMember({
              id: m.id,
              name: m.name,
              latitude: m.latitude,
              longitude: m.longitude,
              accuracy: m.accuracy,
              batteryLevel: m.batteryLevel,
              status: m.status ?? 'safe',
              lastSeen: m.lastSeen ?? Date.now(),
              isLeader: m.isLeader || m.name === 'Leader',
            });
          }
        });
      } else if (payload.type === 'START_TRACKING') {
        console.log('✅ Leader started tracking — navigating to TrackingScreen');
        setIsTracking(true);
      } else if (payload.type === 'END_GROUP') {
        // A leader's end action is authoritative for the local-only group.
        // Clear state and radio resources so members do not remain on a stale radar.
        tcpSocketManager.disconnect();
        void wifiDirectManager.leaveGroup();
        useTrackingStore.getState().resetTracking();
      } else if (payload.type === 'ALERT' && payload.reason === 'OUT_OF_RANGE') {
        alertManager.triggerOutOfRangeAlert('You', payload.distance || 50);
      } else if (payload.type === 'ALERT_OUT_OF_RANGE') {
        if (payload.memberId !== useTrackingStore.getState().myDeviceId) return;
        alertManager.triggerOutOfRangeAlert('You', payload.distance || 50);
        const { addAlert } = useTrackingStore.getState();
        addAlert({
          type: 'out_of_range',
          memberName: 'Group Leader',
          message: `⚠️ Alert: You are ${Math.round(payload.distance || 50)}m away — outside of leader's safe radius!`,
        });
      } else if (payload.type === 'SOS') {
        triggerSOS(payload.memberName);
        alertManager.triggerSOSAlert(
          payload.memberName,
          payload.latitude,
          payload.longitude
        );
      } else if (payload.type === 'CHAT') {
        // ✅ BUG FIX: Skip if this is our own message being echoed back by the leader
        const myDeviceId = useTrackingStore.getState().myDeviceId;
        if (payload.memberId === myDeviceId) return; // Don't duplicate our own message
        addMessage({
          senderId: payload.memberId,
          senderName: payload.memberName,
          text: payload.message,
        });
      } else if (payload.type === 'MEETUP_POINT') {
        // ✅ Handle meetup point broadcast from leader
        const { setMeetupPoint, addAlert } = useTrackingStore.getState();
        setMeetupPoint({
          name: payload.name,
          latitude: payload.latitude,
          longitude: payload.longitude,
          setBy: payload.setBy,
          timestamp: Date.now(),
        });
        addAlert({
          type: 'meetup',
          memberName: payload.setBy,
          message: `${payload.setBy} set meetup point: "${payload.name}"`,
        });
        alertManager.triggerReturnAlert(payload.setBy); // Short vibration notification
      }
    };
  }, [updateMemberLocation, addMember, triggerSOS, addMessage, setIsTracking]);

  // ───────────────────────────────────────────────────────────────────
  // LEADER: Become discoverable + start TCP server
  // ───────────────────────────────────────────────────────────────────
  const startHosting = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      // ✅ Start TCP server FIRST — so it is ready before any member connects
      tcpSocketManager.stopServer(); // clean up any previous session
      tcpSocketManager.startServer();
      setupLeaderMessageHandler();

      // Create the Group Owner before advertising the lobby as ready.
      await wifiDirectManager.startHosting();

      setConnectionStatus('connected');
      console.log('✅ Hosting started. TCP server running. Waiting for members...');
    } catch (error) {
      setConnectionStatus('disconnected');
      // Stop the server if hosting failed
      tcpSocketManager.stopServer();
      throw error;
    }
  }, [setConnectionStatus, setupLeaderMessageHandler]);

  // ───────────────────────────────────────────────────────────────────
  // MEMBER: Scan for nearby hosts
  // ───────────────────────────────────────────────────────────────────
  const startScanning = useCallback(
    async (onPeersFound: (peers: any[]) => void) => {
      setConnectionStatus('scanning');
      try {
        await wifiDirectManager.startScanning(onPeersFound);
      } catch (error) {
        setConnectionStatus('disconnected');
        throw error;
      }
    },
    [setConnectionStatus]
  );

  // ───────────────────────────────────────────────────────────────────
  // MEMBER: Connect to a discovered leader and start TCP client
  // ───────────────────────────────────────────────────────────────────
  const connectToLeader = useCallback(
    async (deviceAddress: string) => {
      setConnectionStatus('connecting');
      try {
        // 1. Form the Wi-Fi Direct connection — returns leader IP (192.168.49.1)
        const leaderIp = await wifiDirectManager.connectToLeader(deviceAddress);

        // Install the handler before opening TCP so an immediate GROUP_STATE
        // reply cannot be missed on fast phones.
        setupMemberMessageHandler();

        // 2. Connect TCP client to leader's server
        tcpSocketManager.disconnect();
        await tcpSocketManager.connectToServer(leaderIp);

        // 3. Make the handshake explicit. The leader can now show this member
        // in its lobby before either device has a GPS reading.
        const user = useAuthStore.getState().user;
        const state = useTrackingStore.getState();
        tcpSocketManager.send({
          type: 'JOIN',
          memberId: state.myDeviceId,
          memberName: user?.displayName || user?.email?.split('@')[0] || 'Guest',
          timestamp: Date.now(),
        });

        setConnectionStatus('connected');
        console.log('✅ Member connected to leader at', leaderIp);
      } catch (error) {
        setConnectionStatus('disconnected');
        tcpSocketManager.disconnect();
        throw error;
      }
    },
    [setConnectionStatus, setupMemberMessageHandler]
  );

  return { startHosting, startScanning, connectToLeader };
}
