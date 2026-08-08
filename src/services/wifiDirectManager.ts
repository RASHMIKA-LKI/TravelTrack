// src/services/wifiDirectManager.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
// We do NOT use createGroup() (Autonomous GO mode).
// Instead we use standard Wi-Fi Direct peer negotiation:
//   LEADER → startDiscoveringPeers() (becomes visible)
//   MEMBER → startDiscoveringPeers() → finds leader → connect()
//   Android negotiates Group Owner. GO IP is always 192.168.49.1.
//
// EXPO GO SAFETY
// ─────────────────────────────────────────────────────────────────────────────
// All react-native-wifi-p2p imports are lazy (require() inside functions) so
// this module file loads cleanly in Expo Go where the native module doesn't
// exist. Every method guards on isDemoMode() so demo sessions never touch P2P.
// ─────────────────────────────────────────────────────────────────────────────

import { PermissionsAndroid, Platform } from 'react-native';
import { isDemoMode } from '../utils/isDemoMode';

// The Wi-Fi Direct Group Owner always gets this IP on Android.
export const LEADER_IP = '192.168.49.1';

// ── Lazy P2P module loader ─────────────────────────────────────────────────
let _p2p: any = null;
function getP2P(): any {
  if (!_p2p) {
    try {
      _p2p = require('react-native-wifi-p2p');
    } catch (e) {
      console.warn('react-native-wifi-p2p not available:', e);
      _p2p = {};
    }
  }
  return _p2p;
}

/** Call a named function from react-native-wifi-p2p, safely */
function p2pCall(name: string, ...args: any[]): Promise<any> {
  const rawMod = getP2P();
  const mod = rawMod.default || rawMod;
  if (typeof mod[name] === 'function') return mod[name](...args);
  return Promise.resolve();
}

// ── Runtime permissions ────────────────────────────────────────────────────

async function requestWifiDirectPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(Platform.Version as string, 10);

  const permissions: string[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];
  if (apiLevel >= 33) {
    permissions.push('android.permission.NEARBY_WIFI_DEVICES' as any);
  }

  try {
    const results = await PermissionsAndroid.requestMultiple(permissions as any[]);
    const allGranted = Object.values(results).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED
    );
    if (!allGranted) console.warn('⚠️ Wi-Fi Direct permissions denied:', results);
    return allGranted;
  } catch (e) {
    console.warn('Permission request failed:', e);
    return false;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// WifiDirectManager
// ─────────────────────────────────────────────────────────────────────────────

class WifiDirectManager {
  // Subscriptions: use .remove() — NOT the deprecated unsubscribeFrom* which
  // crashes on RN 0.65+ because DeviceEventEmitter.removeListener was removed.
  private peersSubscription: { remove: () => void } | null = null;
  private connectionSubscription: { remove: () => void } | null = null;
  private isInitialized = false;

  private removeSub(sub: { remove: () => void } | null): null {
    if (sub) { try { sub.remove(); } catch (_) {} }
    return null;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await p2pCall('initialize');
      this.isInitialized = true;
      console.log('✅ Wi-Fi Direct native initialization complete.');
    } catch (e) {
      console.warn('Native P2P initialization warning (non-fatal):', e);
    }
  }

  private async resetFramework(): Promise<void> {
    this.peersSubscription = this.removeSub(this.peersSubscription);
    this.connectionSubscription = this.removeSub(this.connectionSubscription);
    
    // Only call cancel/stop if the native manager was actually initialized to prevent NullPointerException crashes
    if (this.isInitialized) {
      try { await p2pCall('cancelConnect'); } catch (_) {}
      try { await p2pCall('stopDiscoveringPeers'); } catch (_) {}
      // Reset initialized flag so ensureInitialized() re-runs cleanly next time.
      // This prevents the P2P manager from getting stuck in a partially-broken state.
      this.isInitialized = false;
    }
    console.log('🧹 Wi-Fi Direct reset.');
  }

  // ── LEADER ────────────────────────────────────────────────────────────────

  async startHosting(): Promise<void> {
    if (isDemoMode()) return; // demoService handles everything

    const hasPermission = await requestWifiDirectPermissions();
    if (!hasPermission) {
      throw new Error(
        'Wi-Fi and Location permissions are required.\nGrant them in Settings → Apps → TravelTrack → Permissions.'
      );
    }

    // Initialize first before calling any reset operations
    await this.ensureInitialized();
    await this.resetFramework();
    await this.ensureInitialized();
    await sleep(800);

    try {
      // 1. Create P2P Group Owner mode on Leader
      await p2pCall('createGroup');
      console.log('✅ Leader Wi-Fi Direct group created.');
    } catch (e: any) {
      console.warn('createGroup note (may already exist or fallback):', e?.message);
    }

    try {
      // 2. Make Leader discoverable over P2P
      await p2pCall('startDiscoveringPeers');
      console.log('✅ Leader is now discoverable via Wi-Fi Direct.');
    } catch (e: any) {
      console.warn('⚠️ startDiscoveringPeers BUSY on leader, retrying in 1.5s...', e?.message);
      await sleep(1500);
      try {
        await p2pCall('startDiscoveringPeers');
        console.log('✅ Leader is now discoverable via Wi-Fi Direct (retry).');
      } catch (e2: any) {
        console.warn('startDiscoveringPeers warning (non-fatal after retry):', e2?.message);
      }
    }
  }

  async stopHosting(): Promise<void> {
    if (isDemoMode()) return;
    try { await p2pCall('removeGroup'); } catch (_) {}
    await this.resetFramework();
    console.log('Leader stopped hosting.');
  }

  // ── MEMBER ────────────────────────────────────────────────────────────────

  private scanInterval: any = null;

  async startScanning(onPeersFound: (peers: any[]) => void): Promise<void> {
    if (isDemoMode()) return; // ScanScreen uses DEMO_PEERS directly

    const hasPermission = await requestWifiDirectPermissions();
    if (!hasPermission) {
      throw new Error('Location permission is required to scan for nearby devices.');
    }

    await this.ensureInitialized();
    await this.resetFramework();
    await this.ensureInitialized();
    await sleep(800);

    try {
      await p2pCall('startDiscoveringPeers');
    } catch (e: any) {
      console.warn('⚠️ Wi-Fi Direct framework busy, retrying in 1s...', e?.message);
      await sleep(1000);
      try { await p2pCall('startDiscoveringPeers'); } catch (_) {}
    }

    const fetchPeers = async () => {
      try {
        const peersObj = await p2pCall('getAvailablePeers');
        const list = Array.isArray(peersObj) ? peersObj : (peersObj?.devices || []);
        if (list && list.length > 0) {
          console.log(`📡 getAvailablePeers found ${list.length} device(s).`);
          onPeersFound(list);
        }
      } catch (err) {
        console.warn('getAvailablePeers fetch error:', err);
      }
    };

    const p2pMod = getP2P();
    const mod = p2pMod.default || p2pMod;

    this.peersSubscription = mod.subscribeOnPeersUpdates((data: any) => {
      const devicesList = Array.isArray(data) ? data : (data?.devices || []);
      console.log(`Found ${devicesList.length} nearby device(s) via event.`);
      if (devicesList.length > 0) {
        onPeersFound(devicesList);
      } else {
        fetchPeers();
      }
    });

    // Poll getAvailablePeers every 1.5 seconds while scanning
    if (this.scanInterval) clearInterval(this.scanInterval);
    this.scanInterval = setInterval(fetchPeers, 1500);
    fetchPeers();
  }

  async stopScanning(): Promise<void> {
    if (isDemoMode()) return;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    try { await p2pCall('stopDiscoveringPeers'); } catch (_) {}
    this.peersSubscription = this.removeSub(this.peersSubscription);
  }

  async connectToLeader(deviceAddress: string): Promise<string> {
    if (isDemoMode()) return LEADER_IP; // TCP stub handles the rest

    this.connectionSubscription = this.removeSub(this.connectionSubscription);
    await p2pCall('connect', deviceAddress);
    console.log('🔄 Wi-Fi Direct connect() sent. Waiting for group to form...');

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const cleanup = () => { this.connectionSubscription = this.removeSub(this.connectionSubscription); };

      const p2pMod = getP2P();
      const mod = p2pMod.default || p2pMod;
      this.connectionSubscription = mod.subscribeOnConnectionInfoUpdates((info: any) => {
        if (settled) return;
        console.log('Connection info update:', JSON.stringify(info));
        if (!info.groupFormed) return;

        settled = true;
        cleanup();

        const reportedIp = info.groupOwnerAddress?.hostAddress;
        const leaderIp = reportedIp && reportedIp !== '0.0.0.0' ? reportedIp : LEADER_IP;
        console.log(`✅ Wi-Fi Direct group formed! Leader IP: ${leaderIp}`);
        resolve(leaderIp);
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(
            'Connection timed out (25s). Make sure both devices have Wi-Fi on and the leader tapped "Start Hosting Group".'
          ));
        }
      }, 25000);
    });
  }

  async leaveGroup(): Promise<void> {
    if (isDemoMode()) return;
    await this.resetFramework();
  }
}

export const wifiDirectManager = new WifiDirectManager();
