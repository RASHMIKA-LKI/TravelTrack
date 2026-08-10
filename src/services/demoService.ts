// src/services/demoService.ts
//
// Provides a realistic simulation of a Wi-Fi Direct group session.
// Used automatically when running in Expo Go (no native P2P module).
//
// Features:
//  - 3 demo members with realistic Sri Lankan names
//  - GPS locations that slowly drift (simulate movement)
//  - Periodic demo chat messages
//  - Out-of-range alert simulation
//  - All data is injected directly into the Zustand store

import { useTrackingStore } from '../store/useTrackingStore';

// ── Demo members ──────────────────────────────────────────────────────────────
const DEMO_MEMBERS = [
  { id: 'demo-1', name: 'Kasun Perera',  emoji: '👨', battery: 87 },
  { id: 'demo-2', name: 'Nimasha Silva', emoji: '👩', battery: 72 },
  { id: 'demo-3', name: 'Ravindu Mendis',emoji: '🧑', battery: 95 },
];

// A central coordinate in Kandy, Sri Lanka (demo location)
const BASE_LAT = 7.2906;
const BASE_LNG = 80.6337;

// ── Demo chat script ──────────────────────────────────────────────────────────
const DEMO_CHAT_SCRIPT = [
  { memberId: 'demo-1', memberName: 'Kasun Perera',   message: 'Hey! Can everyone hear me? 👋' },
  { memberId: 'demo-2', memberName: 'Nimasha Silva',  message: 'Yes! I\'m connected. This app is so cool 😍' },
  { memberId: 'demo-3', memberName: 'Ravindu Mendis', message: 'Walking toward the temple entrance now.' },
  { memberId: 'demo-1', memberName: 'Kasun Perera',   message: 'Great! I\'ll wait at the fountain.' },
  { memberId: 'demo-2', memberName: 'Nimasha Silva',  message: 'Leader, I\'m heading out of the safe zone 😅' },
  { memberId: 'demo-3', memberName: 'Ravindu Mendis', message: 'Battery at 72%, all good here.' },
];

let chatIdx = 0;

// ── Movement state ─────────────────────────────────────────────────────────────
const memberPositions: Record<string, { lat: number; lng: number; angle: number; speed: number }> = {
  'demo-1': { lat: BASE_LAT + 0.0002,  lng: BASE_LNG + 0.0001,  angle: 45,  speed: 0.000012 },
  'demo-2': { lat: BASE_LAT - 0.0003,  lng: BASE_LNG + 0.0003,  angle: 180, speed: 0.000018 },
  'demo-3': { lat: BASE_LAT + 0.0001,  lng: BASE_LNG - 0.0004,  angle: 270, speed: 0.000008 },
};

/** Move a member position slightly along their direction */
function stepPosition(id: string): { lat: number; lng: number } {
  const pos = memberPositions[id];
  // Drift angle slowly for realistic wandering
  pos.angle += (Math.random() - 0.5) * 20;
  const rad = (pos.angle * Math.PI) / 180;
  pos.lat += Math.cos(rad) * pos.speed;
  pos.lng += Math.sin(rad) * pos.speed;

  // Soft boundary: keep within ~200m of base
  const maxDrift = 0.002;
  if (Math.abs(pos.lat - BASE_LAT) > maxDrift) pos.angle = 180 - pos.angle;
  if (Math.abs(pos.lng - BASE_LNG) > maxDrift) pos.angle = -pos.angle;

  return { lat: pos.lat, lng: pos.lng };
}

/** Simple haversine distance in metres */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Timer handles ─────────────────────────────────────────────────────────────
let locationTimer: ReturnType<typeof setInterval> | null = null;
let chatTimer: ReturnType<typeof setInterval>   | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Bootstrap the demo session.
 * Injects demo members into the store and starts movement + chat timers.
 */
export function startDemo(): void {
  const store = useTrackingStore.getState();

  // Set up group
  store.setRole('leader');
  store.setRadius(50);
  store.setGroup({
    id: 'demo-group',
    name: '🗺️ Demo Trip — Kandy',
    leaderId: 'leader-me',
    radiusMeters: 50,
    createdAt: Date.now(),
  });

  // Set leader's own location
  store.setMyLocation({
    latitude: BASE_LAT,
    longitude: BASE_LNG,
    accuracy: 5,
    speed: 0,
    bearing: 0,
    timestamp: Date.now(),
  });

  // Add demo members
  DEMO_MEMBERS.forEach((m) => {
    const pos = memberPositions[m.id];
    store.addMember({
      id: m.id,
      name: m.name,
      latitude: pos.lat,
      longitude: pos.lng,
      batteryLevel: m.battery,
      status: 'safe',
      lastSeen: Date.now(),
    });
  });

  // Add a couple of seed alerts so the alerts tab isn't empty
  store.addAlert({
    type: 'out_of_range',
    memberName: 'Nimasha Silva',
    message: 'Nimasha Silva is 68m away — outside the safe zone!',
  });
  store.addAlert({
    type: 'returned',
    memberName: 'Nimasha Silva',
    message: 'Nimasha Silva returned to safe zone ✅',
  });

  store.setIsTracking(true);
  store.setConnectionStatus('connected');

  // Seed a couple of chat messages
  store.addMessage({ senderId: 'demo-1', senderName: 'Kasun Perera',   text: 'Hey! Can everyone hear me? 👋' });
  store.addMessage({ senderId: 'demo-2', senderName: 'Nimasha Silva',  text: 'Yes! Connected. This app is so cool 😍' });

  // Move member positions every 2 seconds
  locationTimer = setInterval(() => {
    const { updateMemberLocation, radiusMeters, myLocation } = useTrackingStore.getState();
    const { calculateBearing } = require('../utils/geofence');

    DEMO_MEMBERS.forEach((m) => {
      const { lat, lng } = stepPosition(m.id);
      const gpsDist = myLocation
        ? haversine(myLocation.latitude, myLocation.longitude, lat, lng)
        : 0;

      const bearingDegrees = myLocation
        ? calculateBearing(myLocation.latitude, myLocation.longitude, lat, lng)
        : 0;

      const status = gpsDist > radiusMeters ? 'out_of_range' : 'safe';

      const updateData: any = {
        latitude: lat,
        longitude: lng,
        lastSeen: Date.now(),
        status,
        accuracy: 8,
        bearingDegrees,
      };

      if (status === 'out_of_range') {
        updateData.lastKnownLatitude = lat;
        updateData.lastKnownLongitude = lng;
        updateData.lastKnownTimestamp = Date.now();
      }

      updateMemberLocation(m.id, updateData);
    });
  }, 2000);

  // Drip out the remaining chat messages every 8 seconds
  chatTimer = setInterval(() => {
    if (chatIdx >= DEMO_CHAT_SCRIPT.length) {
      if (chatTimer) clearInterval(chatTimer);
      return;
    }
    const entry = DEMO_CHAT_SCRIPT[chatIdx];
    useTrackingStore.getState().addMessage({
      senderId: entry.memberId,
      senderName: entry.memberName,
      text: entry.message,
    });
    chatIdx++;
  }, 8000);

  console.log('🎭 Demo mode started.');
}

/** Stop all demo timers */
export function stopDemo(): void {
  if (locationTimer) { clearInterval(locationTimer); locationTimer = null; }
  if (chatTimer)     { clearInterval(chatTimer);     chatTimer = null; }
  chatIdx = 0;
  console.log('🎭 Demo mode stopped.');
}

/** Demo peer list shown in ScanScreen */
export const DEMO_PEERS = [
  { deviceAddress: 'DEMO:AA:BB:CC:DD:EE', deviceName: "Kasun's Group (Kandy Expedition)" },
  { deviceAddress: 'DEMO:FF:11:22:33:44', deviceName: "Nimasha's Trek (Knuckles Range)" },
  { deviceAddress: 'DEMO:55:66:77:88:99', deviceName: "Ravindu's Trip (Sigiriya)" },
];

/** Demo group lobby members shown while waiting */
export const DEMO_LOBBY_MEMBERS = DEMO_MEMBERS.map((m) => ({
  id: m.id,
  name: m.name,
  status: 'safe' as const,
  batteryLevel: m.battery,
}));
