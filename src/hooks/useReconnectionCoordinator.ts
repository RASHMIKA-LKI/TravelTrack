// src/hooks/useReconnectionCoordinator.ts
import { useEffect, useRef } from 'react';
import { useTrackingStore } from '../store/useTrackingStore';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { useAuthStore } from '../store/useAuthStore';
import { isDemoMode } from '../utils/isDemoMode';

const DEMO = isDemoMode();

export function useReconnectionCoordinator() {
  const isTracking = useTrackingStore((state) => state.isTracking);
  const role = useTrackingStore((state) => state.role);
  const setConnectionStatus = useTrackingStore((state) => state.setConnectionStatus);
  const myDeviceId = useTrackingStore((state) => state.myDeviceId);
  const lastLeaderIpRef = useRef<string | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);
  const attemptCountRef = useRef<number>(0);

  useEffect(() => {
    if (DEMO || role !== 'member' || !isTracking) return;

    let isMounted = true;

    async function attemptReconnect() {
      if (!isMounted || !isTracking || isReconnectingRef.current) return;
      isReconnectingRef.current = true;
      setConnectionStatus('reconnecting');

      const user = useAuthStore.getState().user;
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Guest Member';
      const groupId = useTrackingStore.getState().group?.id || 'default-group';

      attemptCountRef.current += 1;
      console.log(`🔄 [ReconnectionCoordinator] Attempt #${attemptCountRef.current} starting...`);

      // ── Tier 1: Fast TCP Retry with cached Leader IP ──
      const cachedIp = lastLeaderIpRef.current;
      if (cachedIp) {
        try {
          console.log(`🚀 [Tier 1] Fast TCP retry to cached IP: ${cachedIp}`);
          tcpSocketManager.disconnect();
          await tcpSocketManager.connectToServer(cachedIp);

          // Send idempotent JOIN payload
          tcpSocketManager.send({
            type: 'JOIN',
            groupId,
            memberId: myDeviceId,
            memberName: userName,
            timestamp: Date.now(),
          });

          // Send immediate location sync
          const myLocation = useTrackingStore.getState().myLocation;
          if (myLocation) {
            tcpSocketManager.send({
              type: 'LOCATION',
              groupId,
              memberId: myDeviceId,
              memberName: userName,
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
              accuracy: myLocation.accuracy,
              bearing: myLocation.bearing,
              speed: myLocation.speed,
              timestamp: Date.now(),
            });
          }

          if (isMounted) {
            setConnectionStatus('connected');
            isReconnectingRef.current = false;
            attemptCountRef.current = 0;
            console.log('✅ [Tier 1 Success] Reconnected to Leader TCP Server!');
            return;
          }
        } catch (tier1Err) {
          console.warn('⚠️ [Tier 1 Failed] Cached IP unreachable:', tier1Err);
        }
      }

      // ── Tier 2: Full P2P Discovery Fallback ──
      try {
        console.log('🔍 [Tier 2] Starting Wi-Fi Direct peer discovery fallback...');
        await wifiDirectManager.startScanning(async (peers) => {
          if (!isMounted || !isTracking || tcpSocketManager.isClientConnected) return;

          if (peers && peers.length > 0) {
            const targetPeer = peers[0]; // Connect to discovered group owner
            try {
              console.log('🔗 [Tier 2] Re-connecting Wi-Fi Direct to peer:', targetPeer.deviceAddress);
              const freshIp = await wifiDirectManager.connectToLeader(targetPeer.deviceAddress);
              lastLeaderIpRef.current = freshIp;

              tcpSocketManager.disconnect();
              await tcpSocketManager.connectToServer(freshIp);

              tcpSocketManager.send({
                type: 'JOIN',
                groupId,
                memberId: myDeviceId,
                memberName: userName,
                timestamp: Date.now(),
              });

              if (isMounted) {
                setConnectionStatus('connected');
                isReconnectingRef.current = false;
                attemptCountRef.current = 0;
                console.log('✅ [Tier 2 Success] Reconnected via Wi-Fi P2P discovery!');
              }
            } catch (err) {
              console.warn('⚠️ [Tier 2 Peer Connect Error]:', err);
            }
          }
        });
      } catch (tier2Err) {
        console.warn('⚠️ [Tier 2 Discovery Error]:', tier2Err);
      }

      // Schedule next retry with exponential backoff + jitter if still disconnected
      if (isMounted && isTracking && !tcpSocketManager.isClientConnected) {
        isReconnectingRef.current = false;
        const delays = [2000, 5000, 10000, 20000, 30000];
        const baseDelay = delays[Math.min(attemptCountRef.current, delays.length - 1)];
        const jitter = Math.floor(Math.random() * 1000);
        const nextDelay = baseDelay + jitter;

        console.log(`⏱️ [ReconnectionCoordinator] Next attempt scheduled in ${nextDelay}ms`);
        timerRef.current = setTimeout(attemptReconnect, nextDelay);
      }
    }

    // Monitor socket connection status
    const interval = setInterval(() => {
      if (role === 'member' && isTracking && !tcpSocketManager.isClientConnected && !isReconnectingRef.current) {
        attemptReconnect();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      isReconnectingRef.current = false;
    };
  }, [isTracking, role, myDeviceId, setConnectionStatus]);
}
