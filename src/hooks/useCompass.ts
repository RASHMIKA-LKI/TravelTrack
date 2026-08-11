import { useEffect, useRef, useState } from 'react';
import { DeviceMotion, Magnetometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { useTrackingStore } from '../store/useTrackingStore';
import {
  androidRotationVectorHeading,
  normalizeHeading,
  smoothHeading,
  type HeadingSource,
} from '../utils/heading';

export interface CompassData {
  heading: number;
  isAvailable: boolean;
  /** A heading has actually been received; do not confuse hardware presence with live data. */
  hasHeading: boolean;
  isCalibrated: boolean;
  statusText: string;
  /** Distinguishes phone orientation sensors from movement-only GPS course. */
  source: HeadingSource;
}

export function useCompass(updateIntervalMs: number = 100): CompassData {
  const [heading, setHeading] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasHeading, setHasHeading] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [statusText, setStatusText] = useState('Compass starting');
  const [source, setSource] = useState<HeadingSource>('none');
  const myLocation = useTrackingStore((state) => state.myLocation);
  const lastHeadingRef = useRef(0);
  const sensorFiredRef = useRef(false);
  const sourceRef = useRef<HeadingSource>('none');

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const publish = (
      rawHeading: number,
      calibrated: boolean,
      label: string,
      nextSource: Exclude<HeadingSource, 'gps-course' | 'none'>
    ) => {
      if (!mounted || !Number.isFinite(rawHeading)) return;
      sensorFiredRef.current = true;
      sourceRef.current = nextSource;
      const smoothed = smoothHeading(lastHeadingRef.current, rawHeading);
      lastHeadingRef.current = smoothed;
      setHeading(Math.round(smoothed));
      setHasHeading(true);
      setIsCalibrated(calibrated);
      setStatusText(label);
      setSource(nextSource);
    };

    const startMagnetometerFallback = async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!mounted) return;
      setIsAvailable(available);
      if (!available) {
        setStatusText('Compass sensor unavailable');
        return;
      }
      Magnetometer.setUpdateInterval(updateIntervalMs);
      subscription = Magnetometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const calibrated = magnitude >= 15 && magnitude <= 120;
        const magneticHeading = normalizeHeading((Math.atan2(x, y) * 180) / Math.PI);
        // Low confidence is shown to the user, but it must not freeze the radar.
        publish(
          magneticHeading,
          calibrated,
          calibrated ? 'Compass active' : 'Compass moving; magnetic accuracy is low',
          'magnetometer'
        );
      });
    };

    const startSensor = async () => {
      try {
        const motionAvailable = await DeviceMotion.isAvailableAsync();
        if (!mounted) return;
        if (motionAvailable) {
          let motionEventReceived = false;
          setIsAvailable(true);
          DeviceMotion.setUpdateInterval(updateIntervalMs);
          subscription = DeviceMotion.addListener((measurement) => {
            const alpha = measurement.rotation?.alpha;
            if (!Number.isFinite(alpha)) return;
            motionEventReceived = true;
            const fusedHeading = Platform.OS === 'android'
              ? androidRotationVectorHeading(alpha, measurement.orientation ?? 0)
              : normalizeHeading((-alpha * 180) / Math.PI);
            publish(fusedHeading, true, 'Compass active', 'rotation-vector');
          });
          // Some Android models report the fused sensor as available but never
          // deliver events. Fall back instead of leaving those members at 0°.
          fallbackTimer = setTimeout(() => {
            if (!mounted || motionEventReceived) return;
            subscription?.remove();
            subscription = null;
            void startMagnetometerFallback().catch((error) => {
              console.warn('Magnetometer fallback failed:', error);
              if (mounted) {
                setIsAvailable(false);
                setStatusText('Compass sensor unavailable');
              }
            });
          }, 2_000);
        } else {
          await startMagnetometerFallback();
        }
      } catch (error) {
        console.warn('Rotation-vector compass unavailable; using magnetometer:', error);
        try { await startMagnetometerFallback(); }
        catch (fallbackError) {
          console.warn('Compass initialization error:', fallbackError);
          if (mounted) {
            setIsAvailable(false);
            setStatusText('Compass sensor unavailable');
          }
        }
      }
    };

    void startSensor();
    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription?.remove();
    };
  }, [updateIntervalMs]);

  // GPS course remains useful movement information when orientation hardware is absent.
  // The radar deliberately does not treat this value as the phone-facing direction.
  useEffect(() => {
    if (sensorFiredRef.current) return;

    const hasMovingCourse = Boolean(
      myLocation &&
      myLocation.speed >= 0.8 &&
      Number.isFinite(myLocation.bearing) &&
      myLocation.bearing >= 0
    );

    if (hasMovingCourse && myLocation) {
      const smoothed = smoothHeading(lastHeadingRef.current, myLocation.bearing);
      lastHeadingRef.current = smoothed;
      setHeading(Math.round(smoothed));
      setHasHeading(true);
      setIsCalibrated(false);
      setStatusText('Using GPS travel direction');
      sourceRef.current = 'gps-course';
      setSource('gps-course');
    } else if (sourceRef.current === 'gps-course') {
      // Do not keep presenting an old travel course once the user stops.
      sourceRef.current = 'none';
      setHasHeading(false);
      setStatusText('Compass sensor unavailable');
      setSource('none');
    }
  }, [myLocation]);

  return { heading, isAvailable, hasHeading, isCalibrated, statusText, source };
}
