export function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360;
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
