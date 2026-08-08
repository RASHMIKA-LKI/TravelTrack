// src/hooks/useWifiDirect.ts
import { useCallback } from 'react';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';

export function useWifiDirect() {
  const setConnectionStatus = useTrackingStore((state) => state.setConnectionStatus);
  const addMember = useTrackingStore((state) => state.addMember);
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const triggerSOS = useTrackingStore((state) => state.triggerSOS);
  const addMessage = useTrackingStore((state) => state.addMessage);
  const setIsTracking = useTrackingStore((state) => state.setIsTracking);

  // ───────────────────────────────────────────────────────────────────
  // Shared message handler for the LEADER's TCP server
  // ───────────────────────────────────────────────────────────────────
  const setupLeaderMessageHandler = useCallback(() => {
    tcpSocketManager.onMessageReceived = (payload) => {
      if (payload.type === 'LOCATION') {
        const exists = useTrackingStore
          .getState()
          .members.some((m) => m.id === payload.memberId);

        if (!exists) {
          addMember({
            id: payload.memberId,
            name: payload.memberName,
            latitude: payload.latitude,
            longitude: payload.longitude,
            batteryLevel: payload.batteryLevel,
            status: 'safe',
            lastSeen: payload.timestamp,
          });
        } else {
          updateMemberLocation(payload.memberId, {
            latitude: payload.latitude,
            longitude: payload.longitude,
            batteryLevel: payload.batteryLevel,
            lastSeen: payload.timestamp,
          });
        }

        // Broadcast updated group state to all members
        const myLoc = useTrackingStore.getState().myLocation;
        const updatedMembers = useTrackingStore.getState().members;
        const myDeviceId = useTrackingStore.getState().myDeviceId;
        const groupStatePayload = {
          type: 'GROUP_STATE',
          members: [
            ...(myLoc
              ? [
                  {
                    id: myDeviceId,
                    name: 'Leader',
                    latitude: myLoc.latitude,
                    longitude: myLoc.longitude,
                    batteryLevel: 100,
                    status: 'safe' as const,
                    lastSeen: myLoc.timestamp || Date.now(),
                  },
                ]
              : []),
            ...updatedMembers,
          ],
        };
        tcpSocketManager.broadcast(groupStatePayload);
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
        // ✅ NEW: Handle meetup point from member
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
  }, [addMember, updateMemberLocation, triggerSOS, addMessage]);

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
              batteryLevel: m.batteryLevel ?? 100,
              status: m.status ?? 'safe',
              lastSeen: m.lastSeen ?? Date.now(),
            });
          }
        });
      } else if (payload.type === 'START_TRACKING') {
        console.log('✅ Leader started tracking — navigating to TrackingScreen');
        setIsTracking(true);
      } else if (payload.type === 'ALERT' && payload.reason === 'OUT_OF_RANGE') {
        alertManager.triggerOutOfRangeAlert('You', payload.distance);
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
        // ✅ NEW: Handle meetup point broadcast from leader
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

      // ✅ Make device discoverable via Wi-Fi Direct (NO createGroup call)
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

        // 2. Connect TCP client to leader's server
        tcpSocketManager.disconnect();
        await tcpSocketManager.connectToServer(leaderIp);

        // 3. Set up message handler
        setupMemberMessageHandler();

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
