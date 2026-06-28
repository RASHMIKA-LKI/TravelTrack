// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';

export function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Traveler';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>TravelTrack</Text>
            <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sub}>What would you like to do today?</Text>

        {/* Create Group Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateGroup')}
          activeOpacity={0.9}
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
        </TouchableOpacity>

        {/* Join Group Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.secondary }]}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.9}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 4,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 28,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  cardBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    color: '#1A1A1A',
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5F2',
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
    color: '#1A1A1A',
    marginBottom: 4,
  },
  gridDesc: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
  },
});
