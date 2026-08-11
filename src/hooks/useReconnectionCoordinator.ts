import { useEffect, useRef } from 'react';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { useAuthStore } from '../store/useAuthStore';
import { useTrackingStore } from '../store/useTrackingStore';
import { installMemberMessageHandler } from './useWifiDirect';
import { isDemoMode } from '../utils/isDemoMode';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useReconnectionCoordinator() {
  const role = useTrackingStore((state) => state.role);
  const group = useTrackingStore((state) => state.group);
  const reconnectingRef = useRef(false);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (isDemoMode() || role !== 'member' || !group) return;
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const sendJoin = () => {
      const state = useTrackingStore.getState();
      const activeGroup = state.group;
      if (!activeGroup) return false;
      const user = useAuthStore.getState().user;
      return tcpSocketManager.send({
        type: 'JOIN', groupId: activeGroup.id, sessionId: activeGroup.sessionId,
        joinToken: activeGroup.joinToken, memberId: state.myDeviceId,
        memberName: user?.displayName || user?.email?.split('@')[0] || `Guest ${state.myDeviceId.slice(-4)}`,
        timestamp: Date.now(),
      });
    };

    const awaitWelcome = async () => {
      const deadline = Date.now() + 10_000;
      while (mounted && Date.now() < deadline) {
        if (useTrackingStore.getState().connectionStatus === 'connected') return true;
        await sleep(250);
      }
      return false;
    };

    const connectTcp = async (leaderIp: string) => {
      const state = useTrackingStore.getState();
      const activeGroup = state.group!;
      state.setPendingInvitation({
        version: 1, groupId: activeGroup.id, groupName: activeGroup.name,
        sessionId: activeGroup.sessionId, joinToken: activeGroup.joinToken,
        expiresAt: Date.now() + 60_000,
      });
      installMemberMessageHandler();
      tcpSocketManager.disconnect();
      await tcpSocketManager.connectToServer(leaderIp);
      if (!sendJoin() || !(await awaitWelcome())) {
        tcpSocketManager.disconnect();
        throw new Error('Leader did not confirm the original session.');
      }
    };

    const attemptReconnect = async () => {
      if (!mounted || reconnectingRef.current || tcpSocketManager.isClientConnected) return;
      reconnectingRef.current = true;
      const state = useTrackingStore.getState();
      state.setConnectionStatus('reconnecting');
      attemptRef.current += 1;

      try {
        if (state.lastLeaderIp) {
          await connectTcp(state.lastLeaderIp);
          attemptRef.current = 0;
          return;
        }

        const expectedAddress = state.lastLeaderDeviceAddress;
        if (!expectedAddress) throw new Error('Original leader address is unavailable.');
        await new Promise<void>((resolve, reject) => {
          let found = false;
          let finished = false;
          const timeout = setTimeout(() => {
            finished = true;
            void wifiDirectManager.stopScanning();
            reject(new Error('Original leader was not found nearby.'));
          }, 12_000);
          void wifiDirectManager.startScanning(async (peers) => {
              if (found || finished || !mounted) return;
              const originalLeader = peers.find((peer: any) => peer.deviceAddress === expectedAddress);
              if (!originalLeader) return;
              found = true;
              clearTimeout(timeout);
              try {
                const leaderIp = await wifiDirectManager.connectToLeader(expectedAddress);
                useTrackingStore.getState().setLeaderConnection(expectedAddress, leaderIp);
                await connectTcp(leaderIp);
                attemptRef.current = 0;
                finished = true;
                resolve();
              } catch (error) {
                finished = true;
                reject(error);
              }
            }).catch((error) => {
            finished = true;
            clearTimeout(timeout);
            reject(error);
          });
        });
      } catch (error) {
        console.warn('Fast group reconnection failed:', error);
      } finally {
        reconnectingRef.current = false;
        if (mounted && !tcpSocketManager.isClientConnected) {
          const delays = [2_000, 5_000, 10_000, 20_000, 30_000];
          const delay = delays[Math.min(attemptRef.current - 1, delays.length - 1)] + Math.floor(Math.random() * 750);
          retryTimer = setTimeout(attemptReconnect, delay);
        }
      }
    };

    const monitor = setInterval(() => {
      if (!tcpSocketManager.isClientConnected) void attemptReconnect();
    }, 3_000);

    return () => {
      mounted = false;
      clearInterval(monitor);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [role, group?.id, group?.sessionId]);
}
