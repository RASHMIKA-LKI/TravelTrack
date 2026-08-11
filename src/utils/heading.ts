export function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360;
}

export type HeadingSource = 'rotation-vector' | 'magnetometer' | 'gps-course' | 'none';

/** GPS course describes travel, not the direction a stationary phone is facing. */
export function isPhoneFacingHeadingSource(source: HeadingSource): boolean {
  return source === 'rotation-vector' || source === 'magnetometer';
}

/** Sensorless devices use a stable north-up radar rather than a false compass rotation. */
export function getRadarHeading(source: HeadingSource, heading: number): number {
  return isPhoneFacingHeadingSource(source) && Number.isFinite(heading)
    ? normalizeHeading(heading)
    : 0;
}

/** Smooth across the 0/360 boundary without rotating the long way around. */
export function smoothHeading(previous: number, next: number, alpha = 0.22): number {
  const delta = (normalizeHeading(next) - normalizeHeading(previous) + 540) % 360 - 180;
  return normalizeHeading(previous + delta * alpha);
}

/** Expo Android DeviceMotion exposes rotation-vector azimuth as negative radians. */
export function androidRotationVectorHeading(alphaRadians: number, screenOrientation = 0): number {
  return normalizeHeading((-alphaRadians * 180) / Math.PI + screenOrientation);
}
