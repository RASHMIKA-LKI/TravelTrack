// src/types/models.ts
export interface User {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
}

export type MemberSafetyStatus =
  | 'unknown'
  | 'safe'
  | 'warning'
  | 'out_of_range'
  | 'gps_uncertain'
  | 'disconnected'
  | 'sos';

export type PeerConnectionState = 'connected' | 'degraded' | 'disconnected';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  /** Timestamp supplied by the local location provider for the actual GPS fix. */
  timestamp: number;
}

export interface Member {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Battery is optional because the offline transport does not read it. */
  batteryLevel?: number;
  status: MemberSafetyStatus;
  lastSeen: number;
  isLeader?: boolean;
  /** GPS accuracy reported by the member's device, in metres. */
  accuracy?: number;
  bearingDegrees?: number;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  lastKnownTimestamp?: number;
  /** Legacy alias retained for existing UI. Prefer lastPacketReceivedAt. */
  lastReceivedAt?: number;
  /** Local time when any packet from this peer was received. */
  lastPacketReceivedAt?: number;
  /** Local time when the latest LOCATION packet itself was received. */
  lastLocationReceivedAt?: number;
  /** Clock-safe local reconstruction of when the source GPS fix was produced. */
  sourceFixReceivedAt?: number;
  /** Monotonic location sequence used to reject older/replayed samples. */
  locationSequence?: number;
  connectionState?: PeerConnectionState;
}

export interface Group {
  id: string;
  name: string;
  leaderId: string;
  radiusMeters: number;
  createdAt: number;
  /** Changes for every hosted group session, even if a group name is reused. */
  sessionId: string;
  /** Short-lived invitation capability. Never use the Firebase UID here. */
  joinToken: string;
  leaderDeviceAddress?: string;
  leaderIp?: string;
  networkName?: string;
  passphrase?: string;
}

export interface GroupInvitation {
  version: 1;
  groupId: string;
  groupName: string;
  sessionId: string;
  joinToken: string;
  expiresAt: number;
  networkName?: string;
  passphrase?: string;
}

export interface InterruptedSession {
  group: Group;
  members: Member[];
  interruptedAt: number;
}

export interface TripRecord {
  id: string;
  groupName: string;
  startTime: number;
  endTime: number;
  memberCount: number;
}
