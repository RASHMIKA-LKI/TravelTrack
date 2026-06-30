export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; 
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadius(
  memberLat: number,
  memberLon: number,
  leaderLat: number,
  leaderLon: number,
  radiusMeters: number = 50,
): boolean {
  const dist = calculateDistance(memberLat, memberLon, leaderLat, leaderLon);
  return dist <= radiusMeters;
}

export function calculateBearing(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLon - fromLon) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; 
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function getMemberStatus(
  distanceMeters: number,
  radiusMeters: number = 50,
): "safe" | "warning" | "out_of_range" {
  if (distanceMeters > radiusMeters) return "out_of_range";
  if (distanceMeters > radiusMeters * 0.8) return "warning";
  return "safe";
}
