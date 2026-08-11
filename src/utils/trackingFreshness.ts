export const LIVE_LOCATION_MS = 30_000;
export const STALE_LOCATION_MS = 120_000;
export const MAX_RELAYED_AGE_MS = 24 * 60 * 60 * 1000;

export type LocationFreshness = 'live' | 'stale' | 'offline' | 'unknown';

export function clampAgeMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return MAX_RELAYED_AGE_MS;
  return Math.min(MAX_RELAYED_AGE_MS, Math.max(0, value));
}

/** Compute age using only timestamps produced on this device. */
export function getLocalFixAgeMs(fixTimestamp: number, now: number = Date.now()): number {
  return clampAgeMs(now - fixTimestamp);
}

/** Reconstruct a safe local timestamp from an age measured on another device. */
export function reconstructSourceFixTime(fixAgeMs: number, now: number = Date.now()): number {
  return now - clampAgeMs(fixAgeMs);
}

export function getLocationAgeMs(sourceFixReceivedAt?: number, now: number = Date.now()): number {
  if (!sourceFixReceivedAt || !Number.isFinite(sourceFixReceivedAt)) return Infinity;
  return Math.max(0, now - sourceFixReceivedAt);
}

export function getLocationFreshness(
  sourceFixReceivedAt?: number,
  now: number = Date.now()
): LocationFreshness {
  const age = getLocationAgeMs(sourceFixReceivedAt, now);
  if (!Number.isFinite(age)) return 'unknown';
  if (age <= LIVE_LOCATION_MS) return 'live';
  if (age <= STALE_LOCATION_MS) return 'stale';
  return 'offline';
}
