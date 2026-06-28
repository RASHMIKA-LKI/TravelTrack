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
  batteryLevel: number;
  status: 'safe' | 'warning' | 'out_of_range' | 'sos';
  lastSeen: number;
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
