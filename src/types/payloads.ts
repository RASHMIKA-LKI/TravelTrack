// src/types/payloads.ts
export type PayloadType =
  | 'JOIN' | 'WELCOME' | 'LOCATION' | 'GROUP_STATE'
  | 'ALERT' | 'SOS' | 'CHAT' | 'MEETUP_POINT'
  | 'MEMBER_LEFT' | 'KICK';

export interface LocationPayload {
  type: 'LOCATION';
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  bearing: number;
  speed: number;
  batteryLevel: number;
  timestamp: number;
}

export interface SOSPayload {
  type: 'SOS';
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  message: string;
  timestamp: number;
}

export interface ChatPayload {
  type: 'CHAT';
  memberId: string;
  memberName: string;
  message: string;
  timestamp: number;
}
