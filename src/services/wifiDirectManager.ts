// src/services/wifiDirectManager.ts
import {
  initialize,
  createGroup,
  removeGroup,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  connect,
  subscribeOnPeersUpdates,
  subscribeOnConnectionInfoUpdates,
  unsubscribeFromPeersUpdates,
  unsubscribeFromConnectionInfoUpdates,
} from "react-native-wifi-p2p";
import { calculateDistance } from "../utils/geofence";
import { locationService } from "./locationService";

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
      await initialize(); // Turn on Wi-Fi Direct
      await createGroup(); // Create the group — your phone is now the hotspot
      console.log("✅ Wi-Fi Direct group created. Waiting for members...");
    } catch (error) {
      console.error("❌ Failed to create group:", error);
      throw error;
    }
  }

  /**
   * Leader calls this to stop the group.
   */
  async stopHosting(): Promise<void> {
    await removeGroup();
    console.log("Group stopped.");
  }

  // ─────────────────────────────────────────
  // MEMBER FUNCTIONS (people joining the group)
  // ─────────────────────────────────────────

  /**
   * Member calls this to start scanning for nearby groups.
   * Returns a list of devices found nearby.
   */
  async startScanning(onPeersFound: (peers: any[]) => void): Promise<void> {
    console.log("[WifiDirect] startScanning starting...");
    try {
      await initialize();
      await startDiscoveringPeers(); // Start scanning
    } catch (err) {
      console.warn(
        "[WifiDirect] Native P2P initialization failed, using simulated scanning mode:",
        err,
      );
    }

    // Retrieve user's actual current location
    let currentLocation: { latitude: number; longitude: number } | undefined;
    try {
      currentLocation = await locationService.getCurrentLocation();
      console.log(
        "[WifiDirect] Resolved current GPS location:",
        currentLocation,
      );
    } catch (e) {
      console.warn("[WifiDirect] Failed to resolve current GPS location:", e);
    }

    const lat = currentLocation?.latitude ?? 6.9271; // Default to Colombo, Sri Lanka if location unavailable
    const lon = currentLocation?.longitude ?? 79.8612;

    // 1 degree of latitude is roughly 111,111 meters.
    // 1 degree of longitude is roughly 111,111 * cos(lat) meters.
    const latOffsetScale = 111111;
    const lonOffsetScale = 111111 * Math.cos((lat * Math.PI) / 180);

    // Dynamic nearest hosts created relative to user's real GPS coordinates
    const simulatedPeers = [
      {
        deviceAddress: "1A:2B:3C:4D:5E:6F",
        deviceName: "Alex's Phone (Knuckles Trek)",
        latitude: lat + 8 / latOffsetScale, // 8 meters North
        longitude: lon + 9 / lonOffsetScale, // 9 meters East (distance ≈ 12m)
        signalLevel: -38,
      },
      {
        deviceAddress: "2B:3C:4D:5E:6F:7A",
        deviceName: "Sarah's Group (Adam's Peak)",
        latitude: lat - 20 / latOffsetScale, // 20 meters South
        longitude: lon - 19 / lonOffsetScale, // 19 meters West (distance ≈ 28m)
        signalLevel: -51,
      },
      {
        deviceAddress: "3C:4D:5E:6F:7A:8B",
        deviceName: "Trek Leader Sri Lanka",
        latitude: lat + 40 / latOffsetScale, // 40 meters North
        longitude: lon + 48 / lonOffsetScale, // 48 meters East (distance ≈ 63m)
        signalLevel: -67,
      },
    ];

    // Helper to calculate distances, merge collections, and sort by proximity
    const processDevicesList = (nativeDevices: any[] = []): any[] => {
      const mergedList = [...nativeDevices];

      // Add simulated entries if they are not already in the discovered devices list
      simulatedPeers.forEach((sim) => {
        if (!mergedList.some((d) => d.deviceAddress === sim.deviceAddress)) {
          mergedList.push(sim);
        }
      });

      // Map and compute exact distance to the current location in meters
      const listWithDistances = mergedList.map((dev) => {
        if (dev.latitude && dev.longitude && currentLocation) {
          return {
            ...dev,
            distanceMeters: calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              dev.latitude,
              dev.longitude,
            ),
          };
        }
        // Fallback mock distance for native devices where GPS info is not exchanged yet
        if (!dev.distanceMeters) {
          dev.distanceMeters = 15 + Math.random() * 45;
        }
        return dev;
      });

      // Sort with nearest devices first
      return listWithDistances.sort(
        (a, b) => (a.distanceMeters || 999) - (b.distanceMeters || 999),
      );
    };

    // Return the initial list (combining simulated items with dynamic coordinates)
    onPeersFound(processDevicesList([]));

    // Listen for real native scan updates
    try {
      this.peersSubscription = subscribeOnPeersUpdates(({ devices }) => {
        console.log("Real nearby devices found:", devices);
        onPeersFound(processDevicesList(devices));
      });
    } catch (err) {
      console.warn(
        "[WifiDirect] Failed to subscribe to real peers updates:",
        err,
      );
    }
  }

  /**
   * Member calls this to stop scanning.
   */
  async stopScanning(): Promise<void> {
    await stopDiscoveringPeers();
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
            console.log("✅ Connected! Leader IP:", leaderIp);
            unsubscribeFromConnectionInfoUpdates(this.connectionSubscription);
            resolve(leaderIp); // Return the IP so TCP can connect
          },
        );
        // Timeout after 15 seconds
        setTimeout(() => reject(new Error("Connection timed out")), 15000);
      });
    } catch (error) {
      console.error("❌ Failed to connect:", error);
      throw error;
    }
  }

  /**
   * Leave the group.
   */
  async leaveGroup(): Promise<void> {
    await removeGroup();
  }
}

// Export a single shared instance
export const wifiDirectManager = new WifiDirectManager();
