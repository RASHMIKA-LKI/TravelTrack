// src/services/wifiDirectManager.ts
// ─────────────────────────────────────────────────────────────────────────────
// STUB — Real implementation will be provided by Member 3 (Wi-Fi Direct Engine)
// This file exists so Member 5's hooks compile without Member 3's branch merged.
// ─────────────────────────────────────────────────────────────────────────────

class WifiDirectManager {
  /**
   * LEADER: Make this device discoverable and start the Wi-Fi Direct group.
   */
  async startHosting(): Promise<void> {
    console.log('[WifiDirect] STUB: startHosting — waiting for Member 3 implementation');
  }

  /**
   * MEMBER: Discover nearby Wi-Fi Direct peers (leaders).
   */
  async startScanning(onPeersFound: (peers: any[]) => void): Promise<void> {
    console.log('[WifiDirect] STUB: startScanning — waiting for Member 3 implementation');
    // Simulate finding 0 peers
    onPeersFound([]);
  }

  /**
   * MEMBER: Connect to a discovered leader device by its address.
   * Returns the leader's IP for the TCP connection.
   */
  async connectToLeader(deviceAddress: string): Promise<string> {
    console.log(`[WifiDirect] STUB: connectToLeader(${deviceAddress}) — waiting for Member 3`);
    return '192.168.49.1'; // Default Wi-Fi Direct group owner IP
  }
}

export const wifiDirectManager = new WifiDirectManager();
