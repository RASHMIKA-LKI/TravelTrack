// src/types/models.ts
export interface User {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Battery is optional because the offline transport does not read it. */
  batteryLevel?: number;
  status: 'safe' | 'warning' | 'out_of_range' | 'sos';
  lastSeen: number;
  isLeader?: boolean;
  /** GPS accuracy reported by the member's device, in metres. */
  accuracy?: number;
  bearingDegrees?: number;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  lastKnownTimestamp?: number;
  /** Local timestamp (Date.now()) when the latest location packet was received on this device. */
  lastReceivedAt?: number;
}

export interface Group {
  id: string;
  name: string;
  leaderId: string;
  radiusMeters: number;
  createdAt: number;
}

export interface TripRecord {
  id: string;
  groupName: string;
  startTime: number;
  endTime: number;
  memberCount: number;
}
