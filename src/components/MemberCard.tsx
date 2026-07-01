// src/components/MemberCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { Member } from '../types/models';
import { formatDistance } from '../utils/geofence';

interface Props {
  member: Member;
  /** Distance from the leader in metres (optional — omit to hide distance) */
  distanceMeters?: number;
}

// Cycle through these emojis based on member id so each member has a consistent avatar
const AVATARS = ['👩', '👨', '👧', '🧑', '👴', '👵'];

/**
 * A card showing one group member's name, avatar, distance, and status badge.
 *
 * Usage:
 *   <MemberCard member={member} distanceMeters={42} />
 */
export function MemberCard({ member, distanceMeters }: Props) {
  const avatarIndex = parseInt(member.id, 10) % AVATARS.length;
  const emoji = isNaN(avatarIndex) ? '👤' : AVATARS[avatarIndex] ?? '👤';

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>

      <View style={styles.info}>
        <Text style={styles.name}>{member.name}</Text>
        {distanceMeters !== undefined && (
          <Text style={styles.distance}>{formatDistance(distanceMeters)} away</Text>
        )}
      </View>

      <StatusBadge status={member.status} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emoji:    { fontSize: 30, marginRight: 12 },
  info:     { flex: 1 },
  name:     { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  distance: { fontSize: 13, color: '#888', marginTop: 2 },
});
