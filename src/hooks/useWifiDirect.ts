// src/hooks/useWifiDirect.ts
import { useCallback } from 'react';

export function useWifiDirect() {
  const startHosting = useCallback(async () => {
    console.log('WifiDirect mock start hosting');
  }, []);

  const startScanning = useCallback(async (onPeersFound: (peers: any[]) => void) => {
    console.log('WifiDirect mock start scanning');
  }, []);

  const connectToLeader = useCallback(async (deviceAddress: string) => {
    console.log('WifiDirect mock connect to leader:', deviceAddress);
  }, []);

  return { startHosting, startScanning, connectToLeader };
}
