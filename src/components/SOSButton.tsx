// src/components/SOSButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';

interface Props {
  /** Optional callback fired after SOS is confirmed and sent */
  onSOS?: () => void;
}

/**
 * A large, unmistakeable SOS button.
 * Pressing it shows a confirmation dialog before firing the SOS alert.
 * Used by Member 4 in any screen that needs emergency functionality.
 */
export function SOSButton({ onSOS }: Props) {
  const triggerSOS = useTrackingStore((state) => state.triggerSOS);

  const handlePress = () => {
    Alert.alert(
      '🆘 Send SOS?',
      'This will alert ALL group members with your current location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: () => {
            triggerSOS('You');
            alertManager.triggerSOSAlert('You', 0, 0);
            if (onSOS) onSOS();
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
      <Text style={styles.icon}>🆘</Text>
      <Text style={styles.label}>SOS Alert</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  icon: { fontSize: 20 },
  label: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
