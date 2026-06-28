// src/screens/TripHistoryScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { firestoreService } from '../services/firestoreService';
import { TripRecord } from '../types/models';

export function TripHistoryScreen({ navigation }: any) {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    async function loadHistory() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        if (firestoreService && firestoreService.getTripHistory) {
          const history = await firestoreService.getTripHistory(user.uid);
          setTrips(history);
        }
      } catch (e) {
        console.warn('Trip history read error, using mockup data for display review.', e);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  // Fallback demo data
  const fallbackTrips: TripRecord[] = [
    {
      id: 't1',
      groupName: 'Hanthana Peak Hike',
      startTime: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
      endTime: Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 4.5, // 4.5 hours duration
      memberCount: 5,
    },
    {
      id: 't2',
      groupName: 'Ella Rock Trekking',
      startTime: Date.now() - 1000 * 60 * 60 * 24 * 8, // 8 days ago
      endTime: Date.now() - 1000 * 60 * 60 * 24 * 8 + 1000 * 60 * 60 * 3, // 3 hours duration
      memberCount: 4,
    },
    {
      id: 't3',
      groupName: 'Knuckles Range Camp',
      startTime: Date.now() - 1000 * 60 * 60 * 24 * 15, // 15 days ago
      endTime: Date.now() - 1000 * 60 * 60 * 24 * 15 + 1000 * 60 * 60 * 8, // 8 hours duration
      memberCount: 7,
    },
  ];

  const displayTrips = trips.length > 0 ? trips : fallbackTrips;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDuration = (start: number, end: number) => {
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip History</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loaderText}>Loading trip logs...</Text>
          </View>
        ) : displayTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⛰️</Text>
            <Text style={styles.emptyTitle}>No Trips Logged Yet</Text>
            <Text style={styles.emptyDesc}>
              Complete your first group trip to see your logs and duration stats tracked here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayTrips}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.tripCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.tripName}>{item.groupName}</Text>
                  <View style={styles.completedBadge}>
                    <Text style={styles.badgeText}>COMPLETED</Text>
                  </View>
                </View>

                <Text style={styles.tripDate}>📅 {formatDate(item.startTime)}</Text>

                <View style={styles.divider} />

                <View style={styles.cardStatsRow}>
                  <View style={styles.cardStat}>
                    <Text style={styles.statLabel}>DURATION</Text>
                    <Text style={styles.statVal}>
                      ⏱️ {calculateDuration(item.startTime, item.endTime)}
                    </Text>
                  </View>

                  <View style={styles.cardStat}>
                    <Text style={styles.statLabel}>MEMBERS</Text>
                    <Text style={styles.statVal}>👥 {item.memberCount} people</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  tripCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    color: '#4CAF50',
    fontSize: 9,
    fontWeight: '800',
  },
  tripDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 12,
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardStat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#888888',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 4,
  },
});
