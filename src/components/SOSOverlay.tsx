// src/components/SOSOverlay.tsx
// Full-screen red flashing overlay shown when an SOS alert is received from another device.
// Includes continuous vibration and an "Acknowledge" button to dismiss.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useTrackingStore } from '../store/useTrackingStore';

const { width, height } = Dimensions.get('window');

export function SOSOverlay() {
  const sosActive = useTrackingStore((state) => state.sosActive);
  const sosTriggeredBy = useTrackingStore((state) => state.sosTriggeredBy);
  const clearSOS = useTrackingStore((state) => state.clearSOS);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (sosActive && sosTriggeredBy && sosTriggeredBy !== 'You') {
      // Start continuous vibration
      Vibration.vibrate([0, 800, 400, 800, 400, 800], true);

      // Flash animation (red pulsing)
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Scale-in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      flashAnim.stopAnimation();
      scaleAnim.setValue(0.8);
    };
  }, [sosActive, sosTriggeredBy]);

  const handleAcknowledge = () => {
    Vibration.cancel();
    clearSOS();
  };

  // Don't show overlay for self-triggered SOS or when SOS is not active
  if (!sosActive || !sosTriggeredBy || sosTriggeredBy === 'You') {
    return null;
  }

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(220, 38, 38, 0.95)', 'rgba(153, 27, 27, 0.98)'],
  });

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="#991B1B" />
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        {/* SOS Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.sosIcon}>🆘</Text>
        </View>

        <Text style={styles.title}>SOS ALERT</Text>
        <Text style={styles.subtitle}>EMERGENCY DISTRESS SIGNAL</Text>

        <View style={styles.senderCard}>
          <Text style={styles.senderLabel}>Alert from</Text>
          <Text style={styles.senderName}>{sosTriggeredBy}</Text>
          <Text style={styles.senderDesc}>
            needs immediate help! Their GPS location has been shared with the group.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.acknowledgeBtn}
          onPress={handleAcknowledge}
          activeOpacity={0.8}
        >
          <Text style={styles.acknowledgeBtnText}>✓ ACKNOWLEDGE</Text>
          <Text style={styles.acknowledgeSubText}>Stop vibration & dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sosIcon: {
    fontSize: 56,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 3,
    marginBottom: 40,
  },
  senderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  senderName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
  },
  senderDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  acknowledgeBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  acknowledgeBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 1,
  },
  acknowledgeSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
    marginTop: 4,
  },
});
