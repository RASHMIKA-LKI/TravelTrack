export interface LocationPayload {
  type: "location";
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  timestamp: number;
}

export interface SOSPayload {
  type: "sos";
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  message?: string;
}

export interface ChatPayload {
  type: "chat";
  userId: string;
  message: string;
  timestamp: number;
  groupId?: string;
}

export type AppPayload = LocationPayload | SOSPayload | ChatPayload;
