import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { requestAllPermissions } from '../utils/permissions';
import { SyncAccountModal } from '../components/SyncAccountModal';

export function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const isGuest = user?.isAnonymous ?? false;
  const userName = user?.displayName || user?.email?.split('@')[0] || (isGuest ? 'Guest' : 'Traveler');

  useEffect(() => {
    requestAllPermissions();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>TravelTrack</Text>
            <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
          </View>
          {isGuest ? (
            <TouchableOpacity style={styles.syncBtn} onPress={() => setSyncModalVisible(true)}>
              <Text style={styles.syncText}>☁️ Connect Account</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sub}>What would you like to do today?</Text>

        {/* Create Group Card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateGroup')}
          activeOpacity={0.9}
          style={styles.cardWrapper}
        >
          <LinearGradient
            colors={['#0A4A6D', '#227093']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <Text style={styles.cardIcon}>👑</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Create Group</Text>
                <Text style={styles.cardDesc}>Start a new journey as group leader and invite others to connect.</Text>
              </View>
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>Host Trip →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Join Group Card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.9}
          style={styles.cardWrapper}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <Text style={styles.cardIcon}>🔍</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Join Group</Text>
                <Text style={styles.cardDesc}>Scan for nearby hosts using Wi-Fi Direct and join their tracking circle.</Text>
              </View>
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>Scan Nearby →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Links Section */}
        <Text style={styles.sectionTitle}>More Features</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('TripHistory')}
            activeOpacity={0.7}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIcon}>📋</Text>
            </View>
            <Text style={styles.gridTitle}>Trip History</Text>
            <Text style={styles.gridDesc}>View logs of your past trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIcon}>⚙️</Text>
            </View>
            <Text style={styles.gridTitle}>Settings</Text>
            <Text style={styles.gridDesc}>Alert settings & intervals</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <SyncAccountModal visible={syncModalVisible} onClose={() => setSyncModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A4A6D',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  syncBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#0A4A6D',
    borderWidth: 1.5,
    borderColor: '#0A4A6D',
    shadowColor: '#0A4A6D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  syncText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 28,
  },
  cardWrapper: {
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  cardBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  gridIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIcon: {
    fontSize: 22,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  gridDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});
