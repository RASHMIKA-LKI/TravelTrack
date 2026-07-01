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
 * - safe       : within the safe radius
 * - warning    : within 120% of the radius (near the edge)
 * - out_of_range: beyond 120% of the radius
 */
export function getMemberStatus(
  distanceMeters: number,
  radiusMeters: number
): 'safe' | 'warning' | 'out_of_range' {
  if (distanceMeters <= radiusMeters) return 'safe';
  if (distanceMeters <= radiusMeters * 1.2) return 'warning';
  return 'out_of_range';
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
