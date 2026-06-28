// src/store/useTrackingStore.ts
import { create } from 'zustand';
import { Member, Group } from '../types/models';

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
