// src/screens/TripHistoryScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { firestoreService } from '../services/firestoreService';
import { offlineSyncService, ExtendedTripRecord } from '../services/offlineSyncService';

export function TripHistoryScreen({ navigation }: any) {
  const [trips, setTrips] = useState<ExtendedTripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuthStore();

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const history = await firestoreService.getTripHistory(user.uid);
      setTrips(history);
    } catch (e) {
      console.warn('Trip history read error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await offlineSyncService.syncPendingData();
      await loadHistory();
    } catch (e) {
      console.warn('Manual sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

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
          <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.syncBtnText}>Sync 🔄</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loaderText}>Loading trip logs...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⛰️</Text>
            <Text style={styles.emptyTitle}>No Trips Logged Yet</Text>
            <Text style={styles.emptyDesc}>
              Complete your first group trip offline or online to see your logs and duration stats tracked here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item, index) => item.id || `trip_${index}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadHistory();
                }}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => {
              const isPending = item.syncStatus === 'pending';
              return (
                <View style={styles.tripCard}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.tripName}>{item.groupName}</Text>
                    <View
                      style={[
                        styles.badge,
                        isPending ? styles.pendingBadge : styles.syncedBadge,
                      ]}
                    >
                      <Text style={[styles.badgeText, isPending ? styles.pendingText : styles.syncedText]}>
                        {isPending ? '📱 SAVED LOCALLY' : '☁️ SYNCED'}
                      </Text>
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
              );
            }}
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
    color: '#1E293B',
  },
  syncBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
  },
  syncBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#64748B',
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
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  syncedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  syncedText: {
    color: colors.safe,
  },
  pendingText: {
    color: '#D97706',
  },
  tripDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#E2E8F0',
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
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
});
