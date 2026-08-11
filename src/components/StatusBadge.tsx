// src/components/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MemberSafetyStatus } from '../types/models';

interface Props {
  status: MemberSafetyStatus;
}

const config: Record<Props['status'], { color: string; label: string }> = {
  safe:         { color: '#4CAF50', label: '✅ Safe' },
  warning:      { color: '#FFC107', label: '⚠️ Near edge' },
  out_of_range: { color: '#D32F2F', label: '🔴 Out of range' },
  sos:          { color: '#D32F2F', label: '🆘 SOS!' },
  unknown:      { color: '#64748B', label: 'GPS pending' },
  gps_uncertain:{ color: '#D97706', label: 'GPS uncertain' },
  disconnected: { color: '#64748B', label: 'Disconnected' },
};

/**
 * A small pill-shaped badge showing a member's current safety status.
 * Background is a 12% tint of the status colour with a solid border.
 *
 * Usage:
 *   <StatusBadge status={member.status} />
 */
export function StatusBadge({ status }: Props) {
  const { color, label } = config[status] ?? config.safe;

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '700' },
});
