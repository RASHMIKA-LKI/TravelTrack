# 👤 Member 3 — Wi-Fi Direct P2P Engine & GPS

> **Your Role:** You build the core technology of the app — the offline connection between phones (Wi-Fi Direct) and the GPS location tracking. This is the most technically challenging part, but this guide walks you through every step.

---

## ✅ Your Task Summary

- Build the Wi-Fi Direct manager (phones find each other without internet)
- Build the TCP socket manager (phones send data to each other)
- Build the GPS location service (track real-time position)
- Build the geofence math (calculate distance between members)
- Build the permissions helper (ask user for location + Wi-Fi access)
- You do NOT build any screens — just the "engines" under the hood

---

## 🔧 STEP 1 — Get Set Up on GitHub

```bash
# Clone the repo (after Member 1 shares the link)
git clone https://github.com/YOUR_TEAM/TravelTrack.git
cd TravelTrack

# Install packages
npm install

# Switch to YOUR branch
git checkout feature/p2p-engine
```

---

## 🔧 STEP 2 — Understand What You're Building

Think of it like this:
- **Leader's phone = a Wi-Fi hotspot router** — it broadcasts a signal
- **Member phones = connect to that signal** — like joining a Wi-Fi network
- **TCP socket = walkie-talkie channel** — phones send messages through it
- **GPS** = reads the phone's location every 3 seconds
- **Geofence** = checks if any member is more than 50 meters away

No internet needed for any of this — it all works offline!

---

## 🔧 STEP 3 — Write the Wi-Fi Direct Manager

Open `src/services/wifiDirectManager.ts` and replace the placeholder with:

```typescript
// src/services/wifiDirectManager.ts
import {
  initialize,
  createGroup,
  removeGroup,
  discoverPeers,
  stopDiscoverPeers,
  connect,
  disconnect,
  getConnectionInfo,
  subscribeOnPeersUpdates,
  subscribeOnConnectionInfoUpdates,
  unsubscribeFromPeersUpdates,
  unsubscribeFromConnectionInfoUpdates,
} from 'react-native-wifi-p2p';

class WifiDirectManager {
  private peersSubscription: any = null;
  private connectionSubscription: any = null;

  // ─────────────────────────────────────────
  // LEADER FUNCTIONS (the person who creates the group)
  // ─────────────────────────────────────────

  /**
   * Leader calls this to start a Wi-Fi Direct group.
   * Their phone becomes the "Group Owner" (like a router).
   */
  async startHosting(): Promise<void> {
    try {
      await initialize();  // Turn on Wi-Fi Direct
      await createGroup(); // Create the group — your phone is now the hotspot
      console.log('✅ Wi-Fi Direct group created. Waiting for members...');
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Leader calls this to stop the group.
   */
  async stopHosting(): Promise<void> {
    await removeGroup();
    console.log('Group stopped.');
  }

  // ─────────────────────────────────────────
  // MEMBER FUNCTIONS (people joining the group)
  // ─────────────────────────────────────────

  /**
   * Member calls this to start scanning for nearby groups.
   * Returns a list of devices found nearby.
   */
  async startScanning(
    onPeersFound: (peers: any[]) => void
  ): Promise<void> {
    await initialize();
    await discoverPeers(); // Start scanning

    // Listen for scan results
    this.peersSubscription = subscribeOnPeersUpdates(({ devices }) => {
      console.log('Found nearby devices:', devices);
      onPeersFound(devices);
    });
  }

  /**
   * Member calls this to stop scanning.
   */
  async stopScanning(): Promise<void> {
    await stopDiscoverPeers();
    if (this.peersSubscription) {
      unsubscribeFromPeersUpdates(this.peersSubscription);
    }
  }

  /**
   * Member calls this to connect to the leader's device.
   * deviceAddress comes from the scan results above.
   */
  async connectToLeader(deviceAddress: string): Promise<string> {
    try {
      await connect(deviceAddress); // Connect to the leader

      // Wait for connection info (we need the leader's IP address)
      return new Promise((resolve, reject) => {
        this.connectionSubscription = subscribeOnConnectionInfoUpdates(
          (connectionInfo: any) => {
            const leaderIp = connectionInfo.groupOwnerAddress;
            console.log('✅ Connected! Leader IP:', leaderIp);
            unsubscribeFromConnectionInfoUpdates(this.connectionSubscription);
            resolve(leaderIp); // Return the IP so TCP can connect
          }
        );
        // Timeout after 15 seconds
        setTimeout(() => reject(new Error('Connection timed out')), 15000);
      });
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Leave the group.
   */
  async leaveGroup(): Promise<void> {
    await disconnect();
  }
}

// Export a single shared instance
export const wifiDirectManager = new WifiDirectManager();
```

---

## 🔧 STEP 4 — Write the TCP Socket Manager

TCP sockets are how the phones actually talk to each other once connected.
Think of it as a messaging channel — leader has a "post office" (server), members send letters (messages) to it.

Open `src/services/tcpSocketManager.ts`:

```typescript
// src/services/tcpSocketManager.ts
import TcpSocket from 'react-native-tcp-socket';
import { LocationPayload, SOSPayload, ChatPayload } from '../types/payloads';

const PORT = 8888; // The "channel number" both sides must use

class TcpSocketManager {
  private server: any = null;      // Leader's server
  private client: any = null;      // Member's connection to leader
  private connectedSockets: any[] = []; // List of member connections (leader only)
  
  // Callback functions — other code sets these to receive data
  public onMessageReceived: ((payload: any) => void) | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: ((socketId: number) => void) | null = null;

  // ─────────────────────────────────────────
  // LEADER: Start a server to receive from members
  // ─────────────────────────────────────────

  startServer(): void {
    this.server = TcpSocket.createServer((socket: any) => {
      console.log('✅ A member connected!');
      
      socket.id = Date.now(); // Give each socket a unique ID
      this.connectedSockets.push(socket);
      
      if (this.onMemberConnected) {
        this.onMemberConnected(socket.id);
      }

      // When data arrives from a member
      socket.on('data', (data: Buffer) => {
        try {
          const payload = JSON.parse(data.toString());
          if (this.onMessageReceived) {
            this.onMessageReceived(payload);
          }
        } catch (e) {
          console.warn('Failed to parse message:', e);
        }
      });

      // When a member disconnects
      socket.on('close', () => {
        this.connectedSockets = this.connectedSockets.filter(s => s.id !== socket.id);
        if (this.onMemberDisconnected) {
          this.onMemberDisconnected(socket.id);
        }
      });

      socket.on('error', (err: any) => console.error('Socket error:', err));
    });

    // Start listening on all network interfaces
    this.server.listen({ port: PORT, host: '0.0.0.0' }, () => {
      console.log(`✅ TCP Server listening on port ${PORT}`);
    });
  }

  /** Leader: Send a message to ALL connected members */
  broadcast(payload: any): void {
    const message = JSON.stringify(payload);
    this.connectedSockets.forEach(socket => {
      try {
        socket.write(message);
      } catch (e) {
        console.warn('Failed to send to socket:', e);
      }
    });
  }

  /** Leader: Stop the server */
  stopServer(): void {
    if (this.server) {
      this.server.close();
      this.connectedSockets = [];
    }
  }

  // ─────────────────────────────────────────
  // MEMBER: Connect to leader's server
  // ─────────────────────────────────────────

  /** Member: Connect to the leader's IP address */
  connectToServer(leaderIp: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = TcpSocket.createConnection(
        { port: PORT, host: leaderIp },
        () => {
          console.log('✅ Connected to leader server!');
          resolve();
        }
      );

      // When data arrives from leader
      this.client.on('data', (data: Buffer) => {
        try {
          const payload = JSON.parse(data.toString());
          if (this.onMessageReceived) {
            this.onMessageReceived(payload);
          }
        } catch (e) {
          console.warn('Failed to parse message:', e);
        }
      });

      this.client.on('error', (err: any) => {
        console.error('Client error:', err);
        reject(err);
      });
    });
  }

  /** Member: Send a message to the leader */
  send(payload: any): void {
    if (this.client) {
      this.client.write(JSON.stringify(payload));
    }
  }

  /** Member: Disconnect */
  disconnect(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

export const tcpSocketManager = new TcpSocketManager();
```

---

## 🔧 STEP 5 — Write the GPS Location Service

Open `src/services/locationService.ts`:

```typescript
// src/services/locationService.ts
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  timestamp: number;
}

class LocationService {
  private watchId: number | null = null;
  public onLocationUpdate: ((location: LocationData) => void) | null = null;

  /** Ask the user for location permission */
  async requestPermission(): Promise<boolean> {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'TravelTrack needs Location',
        message: 'We need your location to track group members and alert you if someone goes out of range.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  /** Start tracking GPS — updates every 3 seconds */
  async startTracking(): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.error('❌ Location permission denied!');
      return;
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          timestamp: position.timestamp,
        };
        
        console.log('📍 Location update:', location.latitude, location.longitude);
        
        if (this.onLocationUpdate) {
          this.onLocationUpdate(location);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
      },
      {
        enableHighAccuracy: true,    // Use GPS chip, not just cell towers
        distanceFilter: 1,           // Update every 1 meter of movement
        interval: 3000,              // Check every 3 seconds
        fastestInterval: 2000,       // Never faster than every 2 seconds
        forceRequestLocation: true,  // Get a location even if phone hasn't moved
      }
    );
    
    console.log('✅ GPS tracking started. Watch ID:', this.watchId);
  }

  /** Stop tracking GPS */
  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('GPS tracking stopped.');
    }
  }

  /** Get ONE location reading right now */
  getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          timestamp: position.timestamp,
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}

export const locationService = new LocationService();
```

---

## 🔧 STEP 6 — Write the Geofence Math

This file does the distance calculations. Open `src/utils/geofence.ts`:

```typescript
// src/utils/geofence.ts
// This file does all the math for distances between GPS coordinates

/**
 * Haversine formula — calculates the straight-line distance between
 * two GPS coordinates on Earth.
 * Returns distance in METERS.
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a member is within the safe radius.
 * @returns true = safe, false = out of range
 */
export function isWithinRadius(
  memberLat: number, memberLon: number,
  leaderLat: number, leaderLon: number,
  radiusMeters: number = 50
): boolean {
  const dist = calculateDistance(memberLat, memberLon, leaderLat, leaderLon);
  return dist <= radiusMeters;
}

/**
 * Calculate compass bearing from one point to another.
 * Returns degrees 0-360 (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(
  fromLat: number, fromLon: number,
  toLat: number, toLon: number
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLon - fromLon) * Math.PI) / 180;
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Get a human-readable distance string
 * e.g., "23m" or "1.2km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get the status of a member based on distance
 */
export function getMemberStatus(
  distanceMeters: number,
  radiusMeters: number = 50
): 'safe' | 'warning' | 'out_of_range' {
  if (distanceMeters > radiusMeters) return 'out_of_range';
  if (distanceMeters > radiusMeters * 0.8) return 'warning'; // Within 80% of limit = warning
  return 'safe';
}
```

---

## 🔧 STEP 7 — Write the Permissions Helper

Open `src/utils/permissions.ts`:

```typescript
// src/utils/permissions.ts
import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Request ALL permissions the app needs.
 * Call this when the app first starts.
 * Returns true if all granted, false if any denied.
 */
export async function requestAllPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS handles differently

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
    ];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'TravelTrack needs Location and Wi-Fi permissions to track your group. Please enable them in Settings.',
        [{ text: 'OK' }]
      );
    }

    return allGranted;
  } catch (err) {
    console.error('Permission request error:', err);
    return false;
  }
}

/**
 * Check if location permission is already granted (without asking)
 */
export async function hasLocationPermission(): Promise<boolean> {
  const result = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  return result;
}
```

---

## 🔧 STEP 8 — Save and Push Your Work

```bash
git add .
git commit -m "feat: add Wi-Fi Direct manager, TCP socket manager, GPS service, and geofence utils"
git push origin feature/p2p-engine
```

---

## 🔁 How to Stay Updated

```bash
git checkout main
git pull origin main
git checkout feature/p2p-engine
git merge main
```

---

## ✅ Your Checklist

- [ ] `src/services/wifiDirectManager.ts` — Leader can create group, member can scan + connect
- [ ] `src/services/tcpSocketManager.ts` — Leader server broadcasts, members send/receive
- [ ] `src/services/locationService.ts` — GPS polling every 3 seconds
- [ ] `src/utils/geofence.ts` — Distance formula, status calculator
- [ ] `src/utils/permissions.ts` — Permissions request helper
- [ ] Tested Wi-Fi Direct between 2 actual Android phones
- [ ] GPS reads location correctly
- [ ] All pushed to `feature/p2p-engine`

---

## 📌 Files You Own

- `src/services/wifiDirectManager.ts`
- `src/services/tcpSocketManager.ts`
- `src/services/locationService.ts`
- `src/utils/geofence.ts`
- `src/utils/permissions.ts`

---

## 🤝 What You Provide to the Team

Member 5 (Hooks) will import your services:
```typescript
import { wifiDirectManager } from '../services/wifiDirectManager';
import { locationService } from '../services/locationService';
import { calculateDistance, getMemberStatus } from '../utils/geofence';
```

Member 4 (Screens) will use hooks that wrap your services.
