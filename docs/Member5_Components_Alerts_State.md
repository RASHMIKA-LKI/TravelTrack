# 👤 Member 5 — Components, Alerts & State Management

> **Your Role:** You build the reusable UI components (the small building blocks that screens use), the alert system (sounds + vibrations), the global state store (shared app memory), and the custom hooks (reusable logic). You are the "glue" that connects Member 3's engine to Member 4's screens.

---

## ✅ Your Task Summary

- Build reusable components: RadarView, SOSButton, MemberDot, AlertBanner, etc.
- Build the alert manager (sounds and vibration for SOS, out-of-range, return)
- Build the Zustand tracking store (global memory of who's where, who triggered SOS)
- Build the hooks (useLocation, useWifiDirect, useGeofence, useAlerts)
- You do NOT build screens — Member 4 does that
- You do NOT build Firebase logic — Member 2 does that

---

## 🔧 STEP 1 — Get Set Up on GitHub

```bash
git clone https://github.com/YOUR_TEAM/TravelTrack.git
cd TravelTrack
npm install
git checkout feature/components-alerts
```

---

## 🔧 STEP 2 — Write the Alert Manager

This system triggers sounds and vibrations when something important happens.

Open `src/services/alertManager.ts`:

```typescript
// src/services/alertManager.ts
import { Vibration, Alert } from 'react-native';
// Note: react-native-sound is used for audio
// import Sound from 'react-native-sound';

class AlertManager {

  /**
   * Triggered when a member goes out of the 50m radius.
   * Medium vibration + warning sound.
   */
  triggerOutOfRangeAlert(memberName: string, distance: number): void {
    console.log(`⚠️ ALERT: ${memberName} is ${distance}m away — OUT OF RANGE!`);
    
    // Vibration pattern: vibrate, pause, vibrate, pause, vibrate
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    // Show in-app alert
    Alert.alert(
      '⚠️ Member Out of Range',
      `${memberName} is ${Math.round(distance)}m away — outside the safe zone!`,
      [{ text: 'OK' }]
    );

    // TODO: Add sound: this.playSound('alert_warning.mp3')
  }

  /**
   * Triggered when someone hits the SOS button.
   * Emergency siren + full-screen alert.
   */
  triggerSOSAlert(memberName: string, latitude: number, longitude: number): void {
    console.log(`🆘 SOS from ${memberName} at ${latitude}, ${longitude}`);
    
    // Long repeated vibration
    Vibration.vibrate([0, 1000, 300, 1000, 300, 1000], true); // true = repeat
    
    Alert.alert(
      '🆘 SOS ALERT!',
      `${memberName} needs help! Their location has been sent to the group.`,
      [
        {
          text: 'Acknowledge',
          onPress: () => {
            Vibration.cancel(); // Stop vibrating when acknowledged
          }
        }
      ],
      { cancelable: false } // User MUST press acknowledge
    );

    // TODO: Add siren sound: this.playSound('sos_siren.mp3', { loop: true })
  }

  /**
   * Triggered when a member comes back into range.
   * Short happy vibration.
   */
  triggerReturnAlert(memberName: string): void {
    console.log(`✅ ${memberName} returned to safe zone`);
    Vibration.vibrate(200); // Single short vibration
    // TODO: Add success sound: this.playSound('member_returned.mp3')
  }

  /**
   * Stop all alerts (vibrations and sounds)
   */
  cancelAll(): void {
    Vibration.cancel();
    // TODO: Stop all sounds
  }
}

// Export a single shared instance
export const alertManager = new AlertManager();
```

---

## 🔧 STEP 3 — Write the Tracking Store (Global State)

The store is like a shared whiteboard everyone can read and write to. Every screen in the app reads location data and SOS status from here.

Open `src/store/useTrackingStore.ts`:

```typescript
// src/store/useTrackingStore.ts
import { create } from 'zustand';
import { Member, Group } from '../types/models';

// Types for our store
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  timestamp: number;
}

interface Alert {
  id: string;
  type: 'out_of_range' | 'sos' | 'returned' | 'meetup';
  memberName: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface TrackingState {
  // Current user's role
  role: 'leader' | 'member' | null;

  // The group we're in
  group: Group | null;

  // All members and their locations
  members: Member[];

  // My own GPS location
  myLocation: LocationData | null;

  // Is tracking active?
  isTracking: boolean;

  // SOS status
  sosActive: boolean;
  sosTriggeredBy: string | null;

  // Connection status
  connectionStatus: 'disconnected' | 'scanning' | 'connecting' | 'connected';

  // Alerts list
  alerts: Alert[];

  // Chat messages
  messages: ChatMessage[];

  // Safe radius
  radiusMeters: number;

  // ─── ACTIONS ───────────────────────────────────────
  setRole: (role: 'leader' | 'member') => void;
  setGroup: (group: Group) => void;
  setMyLocation: (location: LocationData) => void;
  updateMemberLocation: (memberId: string, locationData: Partial<Member>) => void;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  setIsTracking: (value: boolean) => void;
  triggerSOS: (memberName: string) => void;
  clearSOS: () => void;
  setConnectionStatus: (status: TrackingState['connectionStatus']) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertsRead: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setRadius: (meters: number) => void;
  resetTracking: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  role: null,
  group: null,
  members: [],
  myLocation: null,
  isTracking: false,
  sosActive: false,
  sosTriggeredBy: null,
  connectionStatus: 'disconnected',
  alerts: [],
  messages: [],
  radiusMeters: 50,

  setRole: (role) => set({ role }),

  setGroup: (group) => set({ group }),

  setMyLocation: (location) => set({ myLocation: location }),

  updateMemberLocation: (memberId, locationData) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId ? { ...m, ...locationData } : m
      ),
    })),

  addMember: (member) =>
    set((state) => ({
      members: [...state.members.filter(m => m.id !== member.id), member],
    })),

  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    })),

  setIsTracking: (value) => set({ isTracking: value }),

  triggerSOS: (memberName) =>
    set({
      sosActive: true,
      sosTriggeredBy: memberName,
    }),

  clearSOS: () => set({ sosActive: false, sosTriggeredBy: null }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        {
          ...alert,
          id: Date.now().toString(),
          timestamp: Date.now(),
          read: false,
        },
        ...state.alerts,
      ],
    })),

  markAlertsRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Date.now().toString(),
          timestamp: Date.now(),
        },
      ],
    })),

  setRadius: (meters) => set({ radiusMeters: meters }),

  resetTracking: () =>
    set({
      role: null,
      group: null,
      members: [],
      myLocation: null,
      isTracking: false,
      sosActive: false,
      sosTriggeredBy: null,
      connectionStatus: 'disconnected',
      alerts: [],
      messages: [],
    }),
}));
```

---

## 🔧 STEP 4 — Write the Settings Store

Open `src/store/useSettingsStore.ts`:

```typescript
// src/store/useSettingsStore.ts
import { create } from 'zustand';

interface SettingsState {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  gpsIntervalMs: number;
  defaultRadiusMeters: number;

  toggleSound: () => void;
  toggleVibration: () => void;
  setGpsInterval: (ms: number) => void;
  setDefaultRadius: (meters: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  vibrationEnabled: true,
  gpsIntervalMs: 3000,
  defaultRadiusMeters: 50,

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
  setGpsInterval: (ms) => set({ gpsIntervalMs: ms }),
  setDefaultRadius: (meters) => set({ defaultRadiusMeters: meters }),
}));
```

---

## 🔧 STEP 5 — Write the Custom Hooks

Hooks wrap Member 3's services so screens can use them easily.

### useLocation Hook
```typescript
// src/hooks/useLocation.ts
import { useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { useTrackingStore } from '../store/useTrackingStore';

/**
 * Use this hook in any screen to access location.
 * It automatically starts tracking and updates the store.
 */
export function useLocation() {
  const setMyLocation = useTrackingStore((state) => state.setMyLocation);
  const myLocation = useTrackingStore((state) => state.myLocation);

  useEffect(() => {
    // When this hook is first used, start listening for location updates
    locationService.onLocationUpdate = (location) => {
      setMyLocation(location);
    };

    return () => {
      // Clean up when component unmounts
      locationService.onLocationUpdate = null;
    };
  }, []);

  const startTracking = useCallback(async () => {
    await locationService.startTracking();
  }, []);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
  }, []);

  return {
    myLocation,    // Current GPS position
    startTracking, // Call this to start GPS
    stopTracking,  // Call this to stop GPS
  };
}
```

### useGeofence Hook
```typescript
// src/hooks/useGeofence.ts
import { useEffect } from 'react';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';
import { calculateDistance, getMemberStatus } from '../utils/geofence';

/**
 * Watches all member positions and triggers alerts if anyone goes out of range.
 * Only the LEADER should use this hook.
 */
export function useGeofence() {
  const members = useTrackingStore((state) => state.members);
  const myLocation = useTrackingStore((state) => state.myLocation);
  const radiusMeters = useTrackingStore((state) => state.radiusMeters);
  const updateMemberLocation = useTrackingStore((state) => state.updateMemberLocation);
  const addAlert = useTrackingStore((state) => state.addAlert);

  useEffect(() => {
    if (!myLocation) return;

    members.forEach((member) => {
      const distance = calculateDistance(
        member.latitude, member.longitude,
        myLocation.latitude, myLocation.longitude
      );

      const newStatus = getMemberStatus(distance, radiusMeters);
      const oldStatus = member.status;

      // Update the member's status in the store
      updateMemberLocation(member.id, { status: newStatus });

      // If they just went OUT OF RANGE — alert!
      if (newStatus === 'out_of_range' && oldStatus !== 'out_of_range') {
        alertManager.triggerOutOfRangeAlert(member.name, distance);
        addAlert({
          type: 'out_of_range',
          memberName: member.name,
          message: `${member.name} is ${Math.round(distance)}m away — out of safe zone`,
        });
      }

      // If they just RETURNED to range — celebrate!
      if (newStatus === 'safe' && oldStatus === 'out_of_range') {
        alertManager.triggerReturnAlert(member.name);
        addAlert({
          type: 'returned',
          memberName: member.name,
          message: `${member.name} returned to safe zone`,
        });
      }
    });
  }, [members, myLocation]);
}
```

### useAlerts Hook
```typescript
// src/hooks/useAlerts.ts
import { useTrackingStore } from '../store/useTrackingStore';

/**
 * Use this hook in screens to read and manage alerts.
 */
export function useAlerts() {
  const alerts = useTrackingStore((state) => state.alerts);
  const markAlertsRead = useTrackingStore((state) => state.markAlertsRead);
  const sosActive = useTrackingStore((state) => state.sosActive);
  const sosTriggeredBy = useTrackingStore((state) => state.sosTriggeredBy);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return {
    alerts,          // All alerts list
    unreadCount,     // Number for the notification badge
    sosActive,       // Is SOS currently active?
    sosTriggeredBy,  // Who triggered SOS?
    markAlertsRead,  // Call this when user opens alerts screen
  };
}
```

### useWifiDirect Hook
```typescript
// src/hooks/useWifiDirect.ts
import { useCallback } from 'react';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';

/**
 * Use this hook in the CreateGroup and Scan screens.
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
        addMessage({ senderId: payload.memberId, senderName: payload.memberName, text: payload.message });
      }
    };

    setConnectionStatus('connected');
  }, []);

  /** MEMBER: Scan for nearby groups */
  const startScanning = useCallback(async (onPeersFound: (peers: any[]) => void) => {
    setConnectionStatus('scanning');
    await wifiDirectManager.startScanning(onPeersFound);
  }, []);

  /** MEMBER: Connect to a discovered leader */
  const connectToLeader = useCallback(async (deviceAddress: string) => {
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
        addMessage({ senderId: payload.memberId, senderName: payload.memberName, text: payload.message });
      }
    };

    setConnectionStatus('connected');
  }, []);

  return { startHosting, startScanning, connectToLeader };
}
```

---

## 🔧 STEP 6 — Build Reusable Components

### SOSButton Component
```tsx
// src/components/SOSButton.tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Alert } from 'react-native';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';

interface Props {
  onSOS?: () => void;
}

export function SOSButton({ onSOS }: Props) {
  const triggerSOS = useTrackingStore(state => state.triggerSOS);

  const handlePress = () => {
    Alert.alert(
      '🆘 Send SOS?',
      'This will alert ALL group members with your current location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: () => {
            triggerSOS('You');
            alertManager.triggerSOSAlert('You', 0, 0);
            if (onSOS) onSOS();
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.icon}>🆘</Text>
      <Text style={styles.label}>SOS Alert</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
  },
  icon: { fontSize: 20 },
  label: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
```

### AlertBanner Component
```tsx
// src/components/AlertBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message: string;
  type: 'danger' | 'warning' | 'success';
}

const bannerColors = {
  danger: '#D32F2F',
  warning: '#FFC107',
  success: '#4CAF50',
};

export function AlertBanner({ message, type }: Props) {
  return (
    <View style={[styles.banner, { backgroundColor: bannerColors[type] }]}>
      <Text style={styles.text}>
        {type === 'danger' ? '🆘 ' : type === 'warning' ? '⚠️ ' : '✅ '}
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
```

### StatusBadge Component
```tsx
// src/components/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  status: 'safe' | 'warning' | 'out_of_range' | 'sos';
}

const config: any = {
  safe: { color: '#4CAF50', label: '✅ Safe' },
  warning: { color: '#FFC107', label: '⚠️ Near edge' },
  out_of_range: { color: '#D32F2F', label: '🔴 Out of range' },
  sos: { color: '#D32F2F', label: '🆘 SOS!' },
};

export function StatusBadge({ status }: Props) {
  const { color, label } = config[status] || config.safe;
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: '700' },
});
```

### MemberCard Component
```tsx
// src/components/MemberCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { Member } from '../types/models';
import { formatDistance } from '../utils/geofence';

interface Props {
  member: Member;
  distanceMeters?: number;
}

const emojis = ['👩', '👨', '👧', '🧑', '👴', '👵'];

export function MemberCard({ member, distanceMeters }: Props) {
  const emoji = emojis[parseInt(member.id) % emojis.length] || '👤';

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{member.name}</Text>
        {distanceMeters !== undefined && (
          <Text style={styles.distance}>{formatDistance(distanceMeters)} away</Text>
        )}
      </View>
      <StatusBadge status={member.status} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  emoji: { fontSize: 30, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  distance: { fontSize: 13, color: '#888', marginTop: 2 },
});
```

---

## 🔧 STEP 7 — Save and Push Your Work

```bash
git add .
git commit -m "feat: add tracking store, settings store, alert manager, hooks, and components"
git push origin feature/components-alerts
```

---

## 🔁 How to Stay Updated

```bash
git checkout main
git pull origin main
git checkout feature/components-alerts
git merge main
```

---

## ✅ Your Checklist

- [ ] `src/services/alertManager.ts` — out-of-range, SOS, return alerts
- [ ] `src/store/useTrackingStore.ts` — member locations, alerts, messages, SOS
- [ ] `src/store/useSettingsStore.ts` — sound, vibration, radius settings
- [ ] `src/hooks/useLocation.ts` — wraps GPS service
- [ ] `src/hooks/useGeofence.ts` — watches distances, triggers alerts
- [ ] `src/hooks/useAlerts.ts` — read alerts from store
- [ ] `src/hooks/useWifiDirect.ts` — wraps Wi-Fi Direct for screens
- [ ] `src/components/SOSButton.tsx`
- [ ] `src/components/AlertBanner.tsx`
- [ ] `src/components/StatusBadge.tsx`
- [ ] `src/components/MemberCard.tsx`
- [ ] All pushed to `feature/components-alerts`

---

## 📌 Files You Own

- `src/services/alertManager.ts`
- `src/store/useTrackingStore.ts`
- `src/store/useSettingsStore.ts`
- `src/hooks/useLocation.ts`
- `src/hooks/useWifiDirect.ts`
- `src/hooks/useGeofence.ts`
- `src/hooks/useAlerts.ts`
- `src/components/SOSButton.tsx`
- `src/components/AlertBanner.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/MemberCard.tsx`

---

## 🤝 How Other Members Use Your Work

**Member 4 (Screens)** imports your components:
```tsx
import { SOSButton } from '../components/SOSButton';
import { MemberCard } from '../components/MemberCard';
import { useAlerts } from '../hooks/useAlerts';
import { useWifiDirect } from '../hooks/useWifiDirect';

// In TrackingScreen:
const { alerts, unreadCount } = useAlerts();
const { startHosting, connectToLeader } = useWifiDirect();
```

**Member 3 (Engine)** writes to services that your hooks wrap — you call their functions indirectly through the hooks.
