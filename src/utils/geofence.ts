// src/utils/geofence.ts

/**
 * Calculate the distance in meters between two GPS coordinates.
 * Uses the Haversine formula for accuracy on a sphere.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6_371_000; // Earth's mean radius in metres

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Determine a member's status based on their distance from the leader.
 * GPS accuracy is treated as a radius of uncertainty:
 * - safe: the furthest plausible position is within the safe radius
 * - warning: the reported position could cross the boundary
 * - out_of_range: even the nearest plausible position is outside the boundary
 */
export function getMemberStatus(
  distanceMeters: number,
  radiusMeters: number,
  uncertaintyMeters: number = 0
): 'safe' | 'warning' | 'out_of_range' {
  // GPS reports an accuracy radius, not an exact point.  Only report a member
  // as outside when even the nearest plausible position is outside the group's
  // configured boundary.  A possible boundary crossing is a warning instead.
  const uncertainty = Math.max(0, uncertaintyMeters);
  if (Math.max(0, distanceMeters - uncertainty) > radiusMeters) return 'out_of_range';
  if (distanceMeters + uncertainty > radiusMeters) return 'warning';
  return 'safe';
}

/**
 * Format a distance in metres into a human-readable string.
 * e.g. 45 → "45m",  1234 → "1.2km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Check if a member is within the safe radius.
 * @returns true = safe, false = out of range
 */
export function isWithinRadius(
  memberLat: number,
  memberLon: number,
  leaderLat: number,
  leaderLon: number,
  radiusMeters: number = 50
): boolean {
  const dist = calculateDistance(memberLat, memberLon, leaderLat, leaderLon);
  return dist <= radiusMeters;
}

/**
 * Calculate compass bearing from one point to another.
 * Returns degrees 0-360 (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLon - fromLon) * Math.PI) / 180;
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Convert bearing in degrees (0-360) to a cardinal direction string (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearingDegrees: number): string {
  const normalized = (bearingDegrees % 360 + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

/**
 * Maps a distance onto 1 of the 3 radar concentric rings (or 4 for out of bounds):
 * 1: Inner ring (0 - 33% of safe radius)
 * 2: Middle ring (33% - 66% of safe radius)
 * 3: Outer ring (66% - 100% of safe radius)
 * 4: Out of bounds (> 100% of safe radius)
 */
export function getRadarRingIndex(distanceMeters: number, radiusMeters: number): 1 | 2 | 3 | 4 {
  if (distanceMeters <= radiusMeters * 0.33) return 1;
  if (distanceMeters <= radiusMeters * 0.66) return 2;
  if (distanceMeters <= radiusMeters) return 3;
  return 4;
}
