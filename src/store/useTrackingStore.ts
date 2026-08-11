import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member, Group } from '../types/models';

const DEVICE_ID_KEY = '@traveltrack_device_id';

// Generate a fallback device ID per session while loading persistent ID from storage
const FALLBACK_DEVICE_ID = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getPersistentDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const newId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch (e) {
    return FALLBACK_DEVICE_ID;
  }
}

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

interface MeetupPoint {
  name: string;
  latitude: number;
  longitude: number;
  setBy: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface TrackingState {
  myDeviceId: string;
  role: 'leader' | 'member' | null;
  group: Group | null;
  members: Member[];
  myLocation: LocationData | null;
  isTracking: boolean;
  sosActive: boolean;
  sosTriggeredBy: string | null;
  connectionStatus: 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'reconnecting';
  alerts: Alert[];
  messages: ChatMessage[];
  radiusMeters: number;
  meetupPoint: MeetupPoint | null;

  setMyDeviceId: (deviceId: string) => void;
  setRole: (role: 'leader' | 'member') => void;
  setGroup: (group: Group) => void;
  setMyLocation: (location: LocationData) => void;
  updateMemberLocation: (memberId: string, locationData: Partial<Member>) => void;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  setIsTracking: (value: boolean) => void;
  triggerSOS: (memberName: string) => void;
  clearSOS: () => void;
  setConnectionStatus: (status: 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'reconnecting') => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertsRead: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setRadius: (meters: number) => void;
  setMeetupPoint: (point: MeetupPoint) => void;
  resetTracking: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  myDeviceId: FALLBACK_DEVICE_ID,
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
  meetupPoint: null,

  setMyDeviceId: (myDeviceId) => set({ myDeviceId }),
  setRole: (role) => set({ role }),
  setGroup: (group) => set({ group }),

  // ── Skip the update if coords haven't moved significantly ──────────────────
  // GPS fires ~every second even when stationary. Without this guard every
  // tick re-renders the entire tracking screen even when nothing changed.
  setMyLocation: (location) => {
    const prev = get().myLocation;
    if (prev) {
      const latDiff = Math.abs(prev.latitude - location.latitude);
      const lngDiff = Math.abs(prev.longitude - location.longitude);
      // Keep a low-rate heartbeat for stationary members.  The previous
      // implementation dropped every stationary update, which made a nearby
      // device look stale to the group even though its GPS was still active.
      const elapsed = location.timestamp - prev.timestamp;
      if (latDiff < 0.00001 && lngDiff < 0.00001 && elapsed < 5000) return;
    }
    set({ myLocation: location });
  },

  // ── Only mutate the member that actually changed ───────────────────────────
  updateMemberLocation: (memberId, locationData) =>
    set((state) => {
      const existing = state.members.find((m) => m.id === memberId);
      if (!existing) return state; // Member not found → no change

      const now = Date.now();
      const patch = {
        ...locationData,
        lastReceivedAt: locationData.lastReceivedAt ?? now,
      };

      // Check if any field would actually change
      const hasChange = (Object.keys(patch) as (keyof Member)[]).some(
        (key) => existing[key] !== (patch as any)[key]
      );
      if (!hasChange) return state; // Nothing changed → skip re-render

      const hasValidCoordinates =
        Number.isFinite(patch.latitude) &&
        Number.isFinite(patch.longitude) &&
        !(patch.latitude === 0 && patch.longitude === 0);
      const lastKnown = hasValidCoordinates
        ? {
            lastKnownLatitude: patch.latitude,
            lastKnownLongitude: patch.longitude,
            lastKnownTimestamp: patch.lastSeen ?? now,
          }
        : {};

      return {
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, ...patch, ...lastKnown } : m
        ),
      };
    }),

  addMember: (member) => {
    const now = Date.now();
    const hasValidCoordinates =
      Number.isFinite(member.latitude) &&
      Number.isFinite(member.longitude) &&
      !(member.latitude === 0 && member.longitude === 0);
    const memberWithMetadata = {
      ...(hasValidCoordinates
        ? {
            ...member,
            lastKnownLatitude: member.latitude,
            lastKnownLongitude: member.longitude,
            lastKnownTimestamp: member.lastSeen ?? now,
          }
        : member),
      lastReceivedAt: member.lastReceivedAt ?? now,
    };

    set((state) => ({
      members: [...state.members.filter((m) => m.id !== member.id), memberWithMetadata],
    }));
  },

  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    })),

  setIsTracking: (value) => set({ isTracking: value }),

  triggerSOS: (memberName) =>
    set({ sosActive: true, sosTriggeredBy: memberName }),

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

  setMeetupPoint: (point) => set({ meetupPoint: point }),

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
      meetupPoint: null,
    }),
}));

// Load persistent device ID asynchronously on startup
getPersistentDeviceId().then((id) => {
  useTrackingStore.getState().setMyDeviceId(id);
});

