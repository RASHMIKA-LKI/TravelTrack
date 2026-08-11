import type { LocationData } from '../types/models';

const STATIONARY_COORDINATE_EPSILON = 0.00001;

/**
 * Keep the previously stable coordinate when a provider update only contains
 * sub-metre GPS wander. Timestamp, accuracy, speed and bearing still advance,
 * so a stationary device remains fresh and its compass can keep moving.
 */
export function stabilizeLocationFix(
  previous: LocationData | null,
  next: LocationData
): LocationData {
  if (!previous) return next;
  const isSmallCoordinateChange =
    Math.abs(previous.latitude - next.latitude) < STATIONARY_COORDINATE_EPSILON &&
    Math.abs(previous.longitude - next.longitude) < STATIONARY_COORDINATE_EPSILON;

  return isSmallCoordinateChange
    ? { ...next, latitude: previous.latitude, longitude: previous.longitude }
    : next;
}
