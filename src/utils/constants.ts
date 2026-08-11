// src/utils/constants.ts

/** Safe geofence boundary in meters */
export const SAFE_RADIUS_METERS = 50;

/** GPS polling interval in milliseconds (5 seconds) */
export const LOCATION_SYNC_INTERVAL_MS = 5000;

/** GPS fastest allowed polling interval in milliseconds (3 seconds) */
export const LOCATION_FASTEST_INTERVAL_MS = 3000;

/** Time after which a non-responding member is marked as Stale (30 seconds) */
export const STALE_THRESHOLD_MS = 30_000;

/** Time after which a non-responding member is marked as Offline (120 seconds) */
export const OFFLINE_THRESHOLD_MS = 120_000;

/** TCP Server port used for P2P connection */
export const TCP_PORT = 8888;
