import { create } from 'zustand';
import { Platform } from 'react-native';
import { Group, GroupInvitation, InterruptedSession, LocationData, Member, PeerConnectionState } from '../types/models';

// Used only until AppNavigator finishes the single canonical identity migration.
const FALLBACK_DEVICE_ID = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface TrackingAlert {
  id: string;
  type: 'out_of_range' | 'sos' | 'returned' | 'meetup' | 'connection_lost' | 'gps_uncertain';
  memberName: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface MeetupPoint {
  name: string;
  latitude: number;
  longitude: number;
  setBy: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface PendingSOS {
  eventId: string;
  status: 'pending' | 'sent_to_leader' | 'delivered' | 'failed';
  acknowledgedBy: string[];
  createdAt: number;
  failureReason?: string;
  locationIncluded: boolean;
}

export interface TrackingState {
  myDeviceId: string;
  identityReady: boolean;
  persistenceReady: boolean;
  role: 'leader' | 'member' | null;
  group: Group | null;
  members: Member[];
  myLocation: LocationData | null;
  isTracking: boolean;
  sosActive: boolean;
  sosTriggeredBy: string | null;
  connectionStatus: 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'degraded' | 'reconnecting';
  alerts: TrackingAlert[];
  messages: ChatMessage[];
  radiusMeters: number;
  meetupPoint: MeetupPoint | null;
  pendingInvitation: GroupInvitation | null;
  interruptedSession: InterruptedSession | null;
  pendingSOS: PendingSOS[];
  locationSequence: number;
  lastLeaderDeviceAddress: string | null;
  lastLeaderIp: string | null;

  setIdentity: (deviceId: string) => void;
  setRole: (role: 'leader' | 'member') => void;
  setGroup: (group: Group) => void;
  setMyLocation: (location: LocationData) => void;
  updateMemberLocation: (memberId: string, locationData: Partial<Member>) => void;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  markMemberConnection: (memberId: string, connectionState: PeerConnectionState) => void;
  setIsTracking: (value: boolean) => void;
  triggerSOS: (memberName: string) => void;
  clearSOS: () => void;
  setConnectionStatus: (status: 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'degraded' | 'reconnecting') => void;
  addAlert: (alert: Omit<TrackingAlert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertsRead: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setRadius: (meters: number) => void;
  setMeetupPoint: (point: MeetupPoint) => void;
  setPendingInvitation: (invitation: GroupInvitation | null) => void;
  setLeaderConnection: (deviceAddress: string | null, leaderIp: string | null) => void;
  nextLocationSequence: () => number;
  addPendingSOS: (sos: PendingSOS) => void;
  acknowledgeSOS: (eventId: string, recipientId: string) => void;
  failSOS: (eventId: string, reason: string) => void;
  setInterruptedSession: (session: InterruptedSession | null) => void;
  hydratePersistedData: (data: Partial<Pick<TrackingState, 'alerts' | 'messages' | 'pendingSOS' | 'meetupPoint'>> & { interruptedSession?: InterruptedSession | null }) => void;
  resetTracking: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  myDeviceId: FALLBACK_DEVICE_ID,
  identityReady: false,
  persistenceReady: false,
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
  pendingInvitation: null,
  interruptedSession: null,
  pendingSOS: [],
  locationSequence: 0,
  lastLeaderDeviceAddress: null,
  lastLeaderIp: null,

  setIdentity: (myDeviceId) => set({ myDeviceId, identityReady: true }),
  setRole: (role) => set({ role }),
  setGroup: (group) => set({ group, interruptedSession: null }),

  // Preserve every real provider fix. Transport heartbeats must never manufacture
  // a fresh GPS timestamp from a cached coordinate.
  setMyLocation: (location) => set({ myLocation: location }),

  // ── Only mutate the member that actually changed ───────────────────────────
  updateMemberLocation: (memberId, locationData) =>
    set((state) => {
      const existing = state.members.find((m) => m.id === memberId);
      if (!existing) return state; // Member not found → no change

      const now = Date.now();
      const patch = { ...locationData };

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
            lastKnownTimestamp: patch.sourceFixReceivedAt ?? patch.lastSeen ?? now,
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
      lastReceivedAt: member.lastReceivedAt ?? member.lastPacketReceivedAt ?? now,
      lastPacketReceivedAt: member.lastPacketReceivedAt ?? member.lastReceivedAt ?? now,
      connectionState: member.connectionState ?? 'connected',
    };

    set((state) => ({
      members: [...state.members.filter((m) => m.id !== member.id), memberWithMetadata],
    }));
  },

  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    })),

  markMemberConnection: (memberId, connectionState) =>
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId
          ? {
              ...member,
              connectionState,
              status: connectionState === 'disconnected' ? 'disconnected' : member.status,
            }
          : member
      ),
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
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        },
      ],
    })),

  setRadius: (meters) => set({ radiusMeters: meters }),

  setMeetupPoint: (point) => set({ meetupPoint: point }),

  setPendingInvitation: (pendingInvitation) => set({ pendingInvitation }),

  setLeaderConnection: (lastLeaderDeviceAddress, lastLeaderIp) =>
    set({ lastLeaderDeviceAddress, lastLeaderIp }),

  nextLocationSequence: () => {
    const next = get().locationSequence + 1;
    set({ locationSequence: next });
    return next;
  },

  addPendingSOS: (sos) =>
    set((state) => ({
      pendingSOS: [sos, ...state.pendingSOS.filter((existing) => existing.eventId !== sos.eventId)].slice(0, 50),
    })),

  acknowledgeSOS: (eventId, recipientId) =>
    set((state) => ({
      pendingSOS: state.pendingSOS.map((sos) =>
        sos.eventId === eventId
          ? {
              ...sos,
              status: 'delivered',
              acknowledgedBy: Array.from(new Set([...sos.acknowledgedBy, recipientId])),
            }
          : sos
      ),
    })),

  failSOS: (eventId, failureReason) =>
    set((state) => ({
      pendingSOS: state.pendingSOS.map((sos) =>
        sos.eventId === eventId ? { ...sos, status: 'failed', failureReason } : sos
      ),
    })),

  setInterruptedSession: (interruptedSession) => set({ interruptedSession }),

  hydratePersistedData: (data) => set({
    alerts: Array.isArray(data.alerts) ? data.alerts.slice(0, 500) : [],
    messages: Array.isArray(data.messages) ? data.messages.slice(-500) : [],
    pendingSOS: Array.isArray(data.pendingSOS) ? data.pendingSOS.slice(0, 50) : [],
    meetupPoint: data.meetupPoint ?? null,
    interruptedSession: data.interruptedSession ?? null,
    persistenceReady: true,
  }),

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
      pendingInvitation: null,
      pendingSOS: [],
      locationSequence: 0,
      lastLeaderDeviceAddress: null,
      lastLeaderIp: null,
    }),
}));
