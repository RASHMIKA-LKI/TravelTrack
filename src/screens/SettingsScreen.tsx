import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { SyncAccountModal } from '../components/SyncAccountModal';

export function SettingsScreen({ navigation }: any) {
  const settings = useSettingsStore();
  const { user, logout } = useAuthStore();
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  const isGuest = user?.isAnonymous ?? false;

  // Local/Store fallbacks in case Member 5's store hasn't been loaded on current branch
  const soundEnabled = settings?.soundEnabled ?? true;
  const vibrationEnabled = settings?.vibrationEnabled ?? true;
  const gpsIntervalMs = settings?.gpsIntervalMs ?? 3000;
  const defaultRadiusMeters = settings?.defaultRadiusMeters ?? 50;

  const toggleSound = settings?.toggleSound ?? (() => {});
  const toggleVibration = settings?.toggleVibration ?? (() => {});

  const handleLogout = () => {
    const title = isGuest ? 'Exit Guest Mode' : 'Confirm Logout';
    const message = isGuest
      ? 'Are you sure you want to exit guest mode? Connect an email account first if you want to keep access to trip history saved under this guest account.'
      : 'Are you sure you want to log out of TravelTrack?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isGuest ? 'Exit Guest Mode' : 'Log Out',
        style: 'destructive',
        onPress: () => {
          if (logout) {
            logout();
          }
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Alert Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sound Alerts</Text>
                <Text style={styles.settingDesc}>Not available in this build; alerts use on-screen messages and optional vibration</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={toggleSound}
                disabled
                trackColor={{ false: '#D0D0D0', true: colors.primaryLight }}
                thumbColor={soundEnabled ? colors.primary : '#F4F3F4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Vibration Alerts</Text>
                <Text style={styles.settingDesc}>Vibrate device on boundary warning triggers</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={toggleVibration}
                trackColor={{ false: '#D0D0D0', true: colors.primaryLight }}
                thumbColor={vibrationEnabled ? colors.primary : '#F4F3F4'}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>GPS & Geofence Configuration</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>High-Precision Location Sync</Text>
                <Text style={styles.settingDesc}>GPS polling and P2P heartbeat fixed at 5.0 seconds</Text>
              </View>
              <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 16 }}>5s</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Group Safe Boundary Radius</Text>
                <Text style={styles.settingDesc}>Geofence alert threshold fixed at 50 meters</Text>
              </View>
              <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 16 }}>50m</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          {isGuest ? (
            <View style={styles.guestAccountCard}>
              <View style={styles.guestCardHeader}>
                <Text style={styles.guestBadge}>GUEST MODE</Text>
                <Text style={styles.guestUnsynced}>Not connected</Text>
              </View>
              <Text style={styles.guestCardTitle}>Connect an Email Account</Text>
              <Text style={styles.guestCardDesc}>
                Convert this guest account to email/password while retaining the same account identity and any trip history already saved to it.
              </Text>
              <TouchableOpacity style={styles.syncAccountBtn} onPress={() => setSyncModalVisible(true)} activeOpacity={0.8}>
                <Text style={styles.syncAccountBtnText}>☁️ Connect Account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitGuestBtn} onPress={handleLogout} activeOpacity={0.7}>
                <Text style={styles.exitGuestText}>Exit Guest Mode</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.accountInfoCard}>
              <View style={styles.accountInfoHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{user?.displayName || 'Traveler'}</Text>
                  <Text style={styles.accountEmail}>{user?.email || 'Synced Account'}</Text>
                </View>
                <View style={styles.syncedBadge}>
                  <Text style={styles.syncedBadgeText}>Synced ✅</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={styles.logoutText}>Log Out Account</Text>
                <Text style={styles.logoutIcon}>🚪</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>TravelTrack — Version 1.0.0 (Beta)</Text>
            <Text style={styles.footerText}>Keep your friends close, keep them safe.</Text>
          </View>
        </ScrollView>
      </View>
      <SyncAccountModal visible={syncModalVisible} onClose={() => setSyncModalVisible(false)} />
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
  scroll: {
    flex: 1,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  settingDesc: {
    fontSize: 12,
    color: '#666666',
    marginTop: 3,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5F2',
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666666',
  },
  optionBtnTextActive: {
    color: colors.primary,
  },
  logoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutIcon: {
    fontSize: 18,
  },
  guestAccountCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  guestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  guestBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A4A6D',
    letterSpacing: 1,
    backgroundColor: 'rgba(10, 74, 109, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  guestUnsynced: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  guestCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  guestCardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  syncAccountBtn: {
    backgroundColor: '#0A4A6D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0A4A6D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  syncAccountBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  exitGuestBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  exitGuestText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  accountInfoCard: {
    marginBottom: 12,
  },
  accountInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  syncedBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  syncedBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginVertical: 24,
    gap: 4,
  },
  footerText: {
    color: '#BBBBBB',
    fontSize: 11,
    fontWeight: '600',
  },
});
