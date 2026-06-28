// src/screens/TrackingScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';

export function TrackingScreen({ navigation }: any) {
  const group = useTrackingStore((state) => state.group);
  const members = useTrackingStore((state) => state.members);
  const myLocation = useTrackingStore((state) => state.myLocation);
  const radiusMeters = useTrackingStore((state) => state.radiusMeters) || 50;
  const role = useTrackingStore((state) => state.role);
  const resetTracking = useTrackingStore((state) => state.resetTracking);

  // Animation for the radar line
  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Fallback demo members if store is empty
  const fallbackMembers = [
    { id: '2', name: 'Sarah Mendis', distance: 12, status: 'safe', emoji: '👩', angle: 45 },
    { id: '3', name: 'Mike Perera', distance: 42, status: 'warning', emoji: '👨', angle: 180 },
    { id: '4', name: 'Jack Silva', distance: 68, status: 'out_of_range', emoji: '🧑', angle: 290 },
  ];

  const displayMembers = members.length > 0
    ? members.map((m, idx) => ({
        id: m.id,
        name: m.name,
        distance: m.latitude && myLocation
          ? Math.round(calculateDemoDistance(m.latitude, m.longitude, myLocation.latitude, myLocation.longitude))
          : Math.round(15 + idx * 20),
        status: m.status,
        emoji: ['👩', '👨', '🧑', '👧', '👵'][idx % 5],
        angle: (idx * 110 + 30) % 360,
      }))
    : fallbackMembers;

  function calculateDemoDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    // simplified distance in meters
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const handleEndTracking = () => {
    Alert.alert(
      role === 'leader' ? 'End Trip?' : 'Leave Group?',
      role === 'leader'
        ? 'This will disconnect all members and stop tracking.'
        : 'You will stop sharing location and leave the group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            if (resetTracking) resetTracking();
            navigation.replace('Home');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return colors.safe;
      case 'warning':
        return colors.warning;
      case 'out_of_range':
      case 'sos':
        return colors.danger;
      default:
        return colors.safe;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>TRACKING ACTIVE</Text>
          <Text style={styles.headerTitle}>{group?.name || 'Trek Group'}</Text>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndTracking}>
          <Text style={styles.endBtnText}>{role === 'leader' ? 'End Trip' : 'Leave'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>📍 {radiusMeters}m</Text>
          <Text style={styles.statLabel}>Boundary</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>👥 {displayMembers.length + 1}</Text>
          <Text style={styles.statLabel}>Active Users</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>📡 offline</Text>
          <Text style={styles.statLabel}>P2P Connection</Text>
        </View>
      </View>

      {/* Circular Radar Visualizer */}
      <View style={styles.radarContainer}>
        <View style={styles.radarOuterCircle}>
          <View style={styles.radarMiddleCircle} />
          <View style={styles.radarInnerCircle} />
          
          {/* Animated Sweep Line */}
          <Animated.View style={[styles.radarSweep, { transform: [{ rotate: spin }] }]} />

          {/* Leader Dot (Center) */}
          <View style={styles.leaderCenterDot}>
            <Text style={styles.leaderDotEmoji}>👑</Text>
          </View>

          {/* Member Dots mapped dynamically on radar */}
          {displayMembers.map((m) => {
            // Map distance to visual bounds (max distance is mapped to outer circle border)
            const maxVisualRadius = 90; // outer circle radius is 100
            const percentage = Math.min(m.distance / (radiusMeters * 1.2), 1);
            const visualDist = percentage * maxVisualRadius;
            
            const radAngle = (m.angle * Math.PI) / 180;
            const xOffset = visualDist * Math.cos(radAngle);
            const yOffset = visualDist * Math.sin(radAngle);

            return (
              <View
                key={m.id}
                style={[
                  styles.memberRadarDot,
                  {
                    transform: [{ translateX: xOffset }, { translateY: yOffset }],
                    backgroundColor: getStatusColor(m.status),
                  },
                ]}
              >
                <Text style={styles.memberRadarDotEmoji}>{m.emoji}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Member status details */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Group Members Status</Text>
        <ScrollView style={styles.memberList} contentContainerStyle={{ paddingBottom: 20 }}>
          {displayMembers.map((m) => (
            <View key={m.id} style={styles.memberCard}>
              <Text style={styles.memberCardEmoji}>{m.emoji}</Text>
              <View style={styles.memberCardDetails}>
                <Text style={styles.memberCardName}>{m.name}</Text>
                <Text style={styles.memberCardDist}>{m.distance} meters away</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(m.status) + '15' }]}>
                <View style={[styles.statusBadgeDot, { backgroundColor: getStatusColor(m.status) }]} />
                <Text style={[styles.statusBadgeText, { color: getStatusColor(m.status) }]}>
                  {m.status === 'safe'
                    ? 'Safe'
                    : m.status === 'warning'
                    ? 'Near Edge'
                    : 'Out of Range'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Floating Action Panels */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => navigation.navigate('Chat')}
        >
          <Text style={styles.chatIcon}>💬</Text>
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.meetupBtn}
          onPress={() => Alert.alert('Meetup Point', 'Meetup point broadcast to all members.')}
        >
          <Text style={styles.meetupIcon}>📌</Text>
          <Text style={styles.meetupText}>Meetup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => navigation.navigate('SOS')}
        >
          <Text style={styles.sosIcon}>🆘</Text>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  endBtn: {
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  endBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  stat: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FAFADA', // Subtle light yellow-beige radar grid color
  },
  radarOuterCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 107, 90, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(26, 107, 90, 0.03)',
  },
  radarMiddleCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(26, 107, 90, 0.2)',
  },
  radarInnerCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(26, 107, 90, 0.15)',
  },
  radarSweep: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRightWidth: 1.5,
    borderColor: 'rgba(26, 107, 90, 0.35)',
    borderTopLeftRadius: 110,
    transformOrigin: 'bottom right',
    right: '50%',
    bottom: '50%',
    backgroundColor: 'transparent',
  },
  leaderCenterDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  leaderDotEmoji: {
    fontSize: 15,
  },
  memberRadarDot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  memberRadarDotEmoji: {
    fontSize: 13,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  memberList: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 8,
  },
  memberCardEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  memberCardDetails: {
    flex: 1,
  },
  memberCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  memberCardDist: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  chatBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    gap: 8,
  },
  chatIcon: {
    fontSize: 18,
  },
  chatText: {
    color: '#1A1A1A',
    fontWeight: '700',
    fontSize: 14,
  },
  meetupBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  meetupIcon: {
    fontSize: 18,
  },
  meetupText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  sosBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  sosIcon: {
    fontSize: 18,
  },
  sosText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
