// src/components/MemberCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { Member } from '../types/models';
import { formatDistance, getCardinalDirection, getRadarRingIndex } from '../utils/geofence';

interface Props {
  member: Member;
  /** Distance from the leader in metres (optional — omit to hide distance) */
  distanceMeters?: number;
}

const AVATARS = ['👨', '👩', '🧑', '👧', '👴', '👵'];

export function MemberCard({ member, distanceMeters }: Props) {
  const avatarIndex = parseInt(member.id, 10) % AVATARS.length;
  const isLeader = member.isLeader || member.name.toLowerCase().includes('leader');
  const emoji = isLeader ? '👑' : (isNaN(avatarIndex) ? '👤' : AVATARS[avatarIndex] ?? '👤');

  const cardinal = member.bearingDegrees !== undefined ? getCardinalDirection(member.bearingDegrees) : '';
  const ringIdx = distanceMeters !== undefined ? getRadarRingIndex(distanceMeters, 50) : null;
  const ringLabel = ringIdx ? (ringIdx <= 3 ? `Ring ${ringIdx}` : 'Out of Radius') : '';

  const isOutOfRange = member.status === 'out_of_range';

  return (
    <View style={[styles.card, isOutOfRange && styles.outOfRangeCard]}>
      <View style={[styles.emojiContainer, isLeader && styles.leaderEmojiBg]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.name}</Text>
          {isLeader && <Text style={styles.leaderBadge}>👑 LEADER</Text>}
        </View>
        {distanceMeters !== undefined && (
          <Text style={styles.distance}>
            {formatDistance(distanceMeters)} away {cardinal ? `(${cardinal})` : ''} {ringLabel ? `• ${ringLabel}` : ''}
          </Text>
        )}

        {isOutOfRange && (
          <Text style={styles.lastKnownText}>
            📍 Last GPS position retained
          </Text>
        )}

        {member.accuracy !== undefined && (
          <Text style={styles.accuracyText}>
            GPS accuracy ±{Math.round(member.accuracy)}m
          </Text>
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
  outOfRangeCard: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderEmojiBg: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  emoji: { fontSize: 24 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  leaderBadge: { fontSize: 10, fontWeight: 'bold', color: '#B45309', backgroundColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  distance: { fontSize: 12, color: '#64748B', marginTop: 2 },
  lastKnownText: { fontSize: 11, color: '#EF4444', fontWeight: '600', marginTop: 2 },
  accuracyText: { fontSize: 10, color: '#0A4A6D', fontWeight: '500', marginTop: 1 },
});
