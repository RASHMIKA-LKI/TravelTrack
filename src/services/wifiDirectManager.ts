// src/services/wifiDirectManager.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
// The leader explicitly creates the Wi-Fi Direct group.  That gives clients a
// predictable Group Owner and avoids the fragile race where two phones both
// try to negotiate ownership while discovery is still running.
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
  return Promise.reject(new Error(`Wi-Fi Direct function "${name}" is unavailable in this build.`));
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
    } catch (e: any) {
      // The Android module is a process singleton. A JS fast-refresh can lose
      // this flag while the already-initialised native manager remains valid.
      if (String(e?.message || e).includes('only be initialized once')) {
        this.isInitialized = true;
        return;
      }
      console.warn('Native P2P initialization failed:', e);
      throw new Error('Wi-Fi Direct could not be initialized. Restart the app and try again.');
    }
  }

  /** Stop the current operation without re-initialising the native singleton. */
  private async resetFramework(removeGroup = true): Promise<void> {
    this.peersSubscription = this.removeSub(this.peersSubscription);
    this.connectionSubscription = this.removeSub(this.connectionSubscription);
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Only call cancel/stop if the native manager was actually initialized to prevent NullPointerException crashes
    if (this.isInitialized) {
      try { await p2pCall('cancelConnect'); } catch (_) {}
      try { await p2pCall('stopDiscoveringPeers'); } catch (_) {}
      if (removeGroup) {
        try { await p2pCall('removeGroup'); } catch (_) {}
      }
      // Android releases Wi-Fi Direct operations asynchronously.  Keep the
      // existing native manager alive: the package rejects a second initialize().
      await sleep(removeGroup ? 1000 : 350);
    }
    console.log('🧹 Wi-Fi Direct operations reset.');
  }

  private async waitForGroup(timeoutMs = 12_000): Promise<any> {
    const startedAt = Date.now();
    let lastInfo: any;
    while (Date.now() - startedAt < timeoutMs) {
      try {
        lastInfo = await p2pCall('getConnectionInfo');
        if (lastInfo?.groupFormed) return lastInfo;
      } catch (_) {}
      await sleep(500);
    }
    throw new Error('Wi-Fi Direct group was not ready. Turn Wi-Fi off and on, then try again.');
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

    await this.ensureInitialized();
    await this.resetFramework();

    try {
      await p2pCall('createGroup');
      await this.waitForGroup();
      console.log('✅ Leader Wi-Fi Direct group created.');
    } catch (e: any) {
      throw new Error(`Could not create the host group. ${e?.message || 'Please retry once Wi-Fi is ready.'}`);
    }
  }

  async stopHosting(): Promise<void> {
    if (isDemoMode()) return;
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

    try {
      await p2pCall('startDiscoveringPeers');
    } catch (e: any) {
      // A short backoff is useful after Android tears down an old group, but
      // never pretend discovery succeeded if the framework is still busy.
      await sleep(1200);
      try {
        await p2pCall('startDiscoveringPeers');
      } catch (retryError: any) {
        throw new Error(`Wi-Fi Direct is busy. Wait a moment and scan again. ${retryError?.message || ''}`.trim());
      }
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

    // Keep Android's peer discovery active until the connection request has
    // been accepted. Stopping it immediately before connect is a device-specific
    // race that produces the exact "Operation failed due to an internal error"
    // shown on Samsung/Android builds. We only stop our JS polling/listener here.
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.peersSubscription = this.removeSub(this.peersSubscription);
    this.connectionSubscription = this.removeSub(this.connectionSubscription);

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        this.connectionSubscription = this.removeSub(this.connectionSubscription);
        if (pollTimer) clearInterval(pollTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
      };
      const acceptConnectionInfo = (info: any) => {
        if (settled || !info?.groupFormed) return;
        settled = true;
        cleanup();
        const reportedIp = info.groupOwnerAddress?.hostAddress;
        const leaderIp = reportedIp && reportedIp !== '0.0.0.0' ? reportedIp : LEADER_IP;
        console.log(`✅ Wi-Fi Direct group formed! Leader IP: ${leaderIp}`);
        resolve(leaderIp);
      };

      const p2pMod = getP2P();
      const mod = p2pMod.default || p2pMod;
      this.connectionSubscription = mod.subscribeOnConnectionInfoUpdates((info: any) => {
        console.log('Connection info update:', JSON.stringify(info));
        acceptConnectionInfo(info);
      });

      // Subscribe and poll before connect(): some devices publish the group
      // state immediately, before a post-connect listener can be installed.
      pollTimer = setInterval(async () => {
        try { acceptConnectionInfo(await p2pCall('getConnectionInfo')); } catch (_) {}
      }, 600);
      const requestConnection = async () => {
        try {
          // Do not force group-owner intent: the selected leader has already
          // created the group, and Android can join it using the normal API.
          await p2pCall('connect', deviceAddress);
        } catch (firstError) {
          // Android sometimes keeps a previous cancelled request in-flight.
          // Clear it once, wait for the framework, and retry this same peer.
          try { await p2pCall('cancelConnect'); } catch (_) {}
          await sleep(900);
          await p2pCall('connect', deviceAddress);
        }
      };

      void requestConnection()
        .then(() => console.log('🔄 Wi-Fi Direct connect request sent. Waiting for group to form...'))
        .catch((error: any) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(`Could not start the Wi-Fi Direct connection. ${error?.message || ''}`.trim()));
        });

      timeoutTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(
            'Connection timed out (25s). Make sure both devices have Wi-Fi on and the leader tapped "Start Hosting Group".'
          ));
        }
      }, 25_000);
    });
  }

  async leaveGroup(): Promise<void> {
    if (isDemoMode()) return;
    await this.resetFramework();
  }
}

export const wifiDirectManager = new WifiDirectManager();
