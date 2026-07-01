// src/hooks/useWifiDirect.ts
import { useCallback } from 'react';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';

/**
 * Use this hook in the CreateGroup and Scan screens.
 * Wraps Wi-Fi Direct discovery + TCP messaging logic.
 */
export function useWifiDirect() {
  const setConnectionStatus = useTrackingStore((state) => state.setConnectionStatus);
  const addMember = useTrackingStore((state) => state.addMember);
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const triggerSOS = useTrackingStore((state) => state.triggerSOS);
  const addMessage = useTrackingStore((state) => state.addMessage);

  /** LEADER: Start hosting and set up TCP server */
  const startHosting = useCallback(async () => {
    setConnectionStatus('connecting');
    await wifiDirectManager.startHosting();
    tcpSocketManager.startServer();

    // Handle incoming messages from members
    tcpSocketManager.onMessageReceived = (payload) => {
      if (payload.type === 'LOCATION') {
        updateMemberLocation(payload.memberId, {
          latitude: payload.latitude,
          longitude: payload.longitude,
          batteryLevel: payload.batteryLevel,
          lastSeen: payload.timestamp,
        });
      } else if (payload.type === 'SOS') {
        triggerSOS(payload.memberName);
        alertManager.triggerSOSAlert(payload.memberName, payload.latitude, payload.longitude);
      } else if (payload.type === 'CHAT') {
        addMessage({
          senderId: payload.memberId,
          senderName: payload.memberName,
          text: payload.message,
        });
      }
    };

    setConnectionStatus('connected');
  }, [setConnectionStatus, updateMemberLocation, triggerSOS, addMessage]);

  /** MEMBER: Scan for nearby groups */
  const startScanning = useCallback(
    async (onPeersFound: (peers: any[]) => void) => {
      setConnectionStatus('scanning');
      await wifiDirectManager.startScanning(onPeersFound);
    },
    [setConnectionStatus]
  );

  /** MEMBER: Connect to a discovered leader */
  const connectToLeader = useCallback(
    async (deviceAddress: string) => {
      setConnectionStatus('connecting');
      const leaderIp = await wifiDirectManager.connectToLeader(deviceAddress);
      await tcpSocketManager.connectToServer(leaderIp);

      // Handle messages from leader
      tcpSocketManager.onMessageReceived = (payload) => {
        if (payload.type === 'GROUP_STATE') {
          payload.members?.forEach((m: any) => updateMemberLocation(m.id, m));
        } else if (payload.type === 'ALERT' && payload.reason === 'OUT_OF_RANGE') {
          alertManager.triggerOutOfRangeAlert('You', payload.distance);
        } else if (payload.type === 'SOS') {
          triggerSOS(payload.memberName);
          alertManager.triggerSOSAlert(payload.memberName, payload.latitude, payload.longitude);
        } else if (payload.type === 'CHAT') {
          addMessage({
            senderId: payload.memberId,
            senderName: payload.memberName,
            text: payload.message,
          });
        }
      };

      setConnectionStatus('connected');
    },
    [setConnectionStatus, updateMemberLocation, triggerSOS, addMessage]
  );

  return { startHosting, startScanning, connectToLeader };
}
