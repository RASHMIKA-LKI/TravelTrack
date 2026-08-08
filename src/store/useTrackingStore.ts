// src/store/useTrackingStore.ts
import { create } from 'zustand';
import { Platform } from 'react-native';
import { Member, Group } from '../types/models';

// Generate a unique device ID per session so messages from this device
// can be distinguished from messages received from other devices.
// Using device model + random suffix ensures uniqueness across two phones.
const DEVICE_ID = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  connectionStatus: 'disconnected' | 'scanning' | 'connecting' | 'connected';
  alerts: Alert[];
  messages: ChatMessage[];
  radiusMeters: number;
  meetupPoint: MeetupPoint | null;

  setRole: (role: 'leader' | 'member') => void;
  setGroup: (group: Group) => void;
  setMyLocation: (location: LocationData) => void;
  updateMemberLocation: (memberId: string, locationData: Partial<Member>) => void;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  setIsTracking: (value: boolean) => void;
  triggerSOS: (memberName: string) => void;
  clearSOS: () => void;
  setConnectionStatus: (status: 'disconnected' | 'scanning' | 'connecting' | 'connected') => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertsRead: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setRadius: (meters: number) => void;
  setMeetupPoint: (point: MeetupPoint) => void;
  resetTracking: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  myDeviceId: DEVICE_ID,
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
      // ~1m = 0.00001 degrees. Skip if moved less than 1m.
      if (latDiff < 0.00001 && lngDiff < 0.00001) return;
    }
    set({ myLocation: location });
  },

  // ── Only mutate the member that actually changed ───────────────────────────
  // Always returning a new array from .map() even when nothing changed is
  // what caused the "maximum update depth exceeded" infinite loop in useGeofence.
  // Now we check if any field is actually different before touching state.
  updateMemberLocation: (memberId, locationData) =>
    set((state) => {
      const existing = state.members.find((m) => m.id === memberId);
      if (!existing) return state; // Member not found → no change

      // Check if any field would actually change
      const hasChange = (Object.keys(locationData) as (keyof Member)[]).some(
        (key) => existing[key] !== (locationData as any)[key]
      );
      if (!hasChange) return state; // Nothing changed → skip re-render

      return {
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, ...locationData } : m
        ),
      };
    }),

  addMember: (member) =>
    set((state) => ({
      members: [...state.members.filter((m) => m.id !== member.id), member],
    })),

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
