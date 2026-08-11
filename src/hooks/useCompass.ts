// src/hooks/useCompass.ts
import { useState, useEffect, useRef } from 'react';
import { Magnetometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { useTrackingStore } from '../store/useTrackingStore';

export interface CompassData {
  /** Heading angle in degrees (0 - 360, where 0 = North, 90 = East) */
  heading: number;
  /** Whether magnetometer sensor hardware is available on this device */
  isAvailable: boolean;
  /** True if magnetic field strength is within normal calibrated range */
  isCalibrated: boolean;
  /** User-friendly status message */
  statusText: string;
}

export function useCompass(updateIntervalMs: number = 100): CompassData {
  const [heading, setHeading] = useState<number>(0);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Compass calibrating');

  const myLocation = useTrackingStore((state) => state.myLocation);
  const lastHeadingRef = useRef<number>(0);
  const sensorFiredRef = useRef<boolean>(false);

  useEffect(() => {
    let subscription: any = null;
    let isMounted = true;

    async function setupMagnetometer() {
      try {
        const available = await Magnetometer.isAvailableAsync();
        if (!isMounted) return;
        setIsAvailable(available);

        if (!available) {
          setStatusText('Compass Unavailable (Using GPS Bearing)');
          if (myLocation?.bearing) {
            setHeading(Math.round(myLocation.bearing));
          }
          return;
        }

        Magnetometer.setUpdateInterval(updateIntervalMs);

        subscription = Magnetometer.addListener((data) => {
          if (!isMounted) return;
          sensorFiredRef.current = true;
          let { x, y, z } = data;

          // Compute magnetic field strength magnitude
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          // Normal Earth magnetic field is typically between 15 uT and 100 uT
          const calibrated = magnitude >= 15 && magnitude <= 120;
          setIsCalibrated(calibrated);

          if (!calibrated) {
            setStatusText('Low Magnetometer Confidence (Move in Figure-8)');
          } else {
            setStatusText('Compass Active');
          }

          // Calculate magnetic compass angle relative to top of device screen
          let angleRad = Math.atan2(x, y);
          let rawAngle = angleRad * (180 / Math.PI);
          let normalized = (rawAngle + 360) % 360;

          // Low-pass filter with 360 degree wrap-around correction
          const prev = lastHeadingRef.current;
          let delta = (normalized - prev + 540) % 360 - 180;
          const alpha = 0.18; // Smooth factor
          const smoothed = (prev + delta * alpha + 360) % 360;

          lastHeadingRef.current = smoothed;
          setHeading(Math.round(smoothed));
        });
      } catch (err) {
        console.warn('Magnetometer initialization error:', err);
        if (isMounted) {
          setIsAvailable(false);
          setStatusText('Compass Unavailable');
        }
      }
    }

    setupMagnetometer();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [updateIntervalMs]);

  // Fallback to GPS bearing when magnetometer is unavailable or static
  useEffect(() => {
    if (!sensorFiredRef.current && myLocation?.bearing && myLocation.bearing > 0) {
      setHeading(Math.round(myLocation.bearing));
    }
  }, [myLocation]);

  return { heading, isAvailable, isCalibrated, statusText };
}
