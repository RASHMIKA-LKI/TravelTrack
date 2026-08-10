// src/types/payloads.ts
export type PayloadType =
  | 'JOIN' | 'WELCOME' | 'LOCATION' | 'GROUP_STATE'
  | 'ALERT' | 'SOS' | 'CHAT' | 'MEETUP_POINT'
  | 'MEMBER_LEFT' | 'KICK' | 'ALERT_OUT_OF_RANGE';

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

export interface AlertOutOfRangePayload {
  type: 'ALERT_OUT_OF_RANGE';
  memberId: string;
  memberName: string;
  distance: number;
  timestamp: number;
}
