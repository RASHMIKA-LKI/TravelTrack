// src/types/payloads.ts
export type PayloadType =
  | 'JOIN' | 'WELCOME' | 'LOCATION' | 'GROUP_STATE'
  | 'ALERT' | 'SOS' | 'CHAT' | 'MEETUP_POINT'
  | 'MEMBER_LEFT' | 'KICK' | 'ALERT_OUT_OF_RANGE' | 'END_GROUP'
  | 'PING' | 'PONG' | 'SOS_ACK' | 'REJECT' | 'START_TRACKING';

export interface GroupScopedPayload {
  groupId: string;
  sessionId: string;
  joinToken: string;
}

export interface JoinPayload extends GroupScopedPayload {
  type: 'JOIN';
  memberId: string;
  memberName: string;
  timestamp: number;
}

export interface WelcomePayload extends GroupScopedPayload {
  type: 'WELCOME';
  groupName: string;
  leaderId: string;
  radiusMeters: number;
  createdAt: number;
}

export interface RejectPayload {
  type: 'REJECT';
  reason: string;
}

export interface LocationPayload extends GroupScopedPayload {
  type: 'LOCATION';
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  bearing: number;
  speed: number;
  batteryLevel?: number;
  sequence: number;
  /** Age of the actual GPS fix, computed on the source device's own clock. */
  fixAgeMs: number;
  timestamp: number;
}

export interface SOSPayload extends GroupScopedPayload {
  type: 'SOS';
  eventId: string;
  memberId: string;
  memberName: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationAgeMs?: number;
  message: string;
  timestamp: number;
}

export interface SOSAckPayload extends GroupScopedPayload {
  type: 'SOS_ACK';
  eventId: string;
  recipientId: string;
  timestamp: number;
}

export interface ChatPayload extends GroupScopedPayload {
  type: 'CHAT';
  memberId: string;
  memberName: string;
  message: string;
  timestamp: number;
}

export interface AlertOutOfRangePayload extends GroupScopedPayload {
  type: 'ALERT_OUT_OF_RANGE';
  memberId: string;
  memberName: string;
  distance: number;
  timestamp: number;
}

export interface PingPayload {
  type: 'PING';
  nonce: string;
  timestamp: number;
}

export interface PongPayload {
  type: 'PONG';
  nonce: string;
  timestamp: number;
}
