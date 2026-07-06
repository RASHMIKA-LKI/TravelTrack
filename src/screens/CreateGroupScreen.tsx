// src/screens/CreateGroupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { useWifiDirect } from '../hooks/useWifiDirect';
import { isDemoMode } from '../utils/isDemoMode';
import { startDemo } from '../services/demoService';

const DEMO = isDemoMode();

export function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [radius, setRadius] = useState(50);
  const [loading, setLoading] = useState(false);

  const setRole = useTrackingStore((state) => state.setRole);
  const setGroup = useTrackingStore((state) => state.setGroup);
  const setStoreRadius = useTrackingStore((state) => state.setRadius);
  const setIsTracking = useTrackingStore((state) => state.setIsTracking);
  const { startHosting } = useWifiDirect();

  const handleStart = async () => {
    if (!groupName.trim()) {
      Alert.alert('Validation Error', 'Please enter a group name');
      return;
    }

    setLoading(true);

    // ── DEMO MODE ──────────────────────────────────────────────────────────
    if (DEMO) {
      // Skip all Wi-Fi Direct / TCP logic. Seed the store with simulated data.
      startDemo();
      setStoreRadius(radius);
      setGroup({
        id: 'demo-group',
        name: groupName || '🗺️ Demo Trip',
        leaderId: 'leader-me',
        radiusMeters: radius,
        createdAt: Date.now(),
      });
      setLoading(false);
      navigation.navigate('GroupLobby', { groupName: groupName || '🗺️ Demo Trip', isLeader: true });
      return;
    }
    // ───────────────────────────────────────────────────────────────────────

    try {
      // ✅ Start Wi-Fi Direct discovery + TCP Server
      await startHosting();

      // Configure group in the store
      setRole('leader');
      setStoreRadius(radius);
      setGroup({
        id: Date.now().toString(),
        name: groupName,
        leaderId: 'leader-me',
        radiusMeters: radius,
        createdAt: Date.now(),
      });
      setIsTracking(true);

      navigation.navigate('GroupLobby', { groupName, isLeader: true });
    } catch (error: any) {
      const msg: string = error?.message || 'Unknown error';
      Alert.alert(
        'Wi-Fi Direct Error',
        'Could not start peer discovery.\n\n' +
          '• Make sure Wi-Fi is ON\n' +
          '• Grant Location + Nearby Devices permissions in Settings\n' +
          '• Toggle Wi-Fi off/on and try again\n\n' +
          'Detail: ' + msg,
        [
          {
            text: 'Try Anyway',
            onPress: () => {
              // TCP server already started — proceed to lobby even if
              // Wi-Fi Direct discovery failed. Members who connect via
              // Wi-Fi Direct from their side will still reach the TCP server.
              setRole('leader');
              setStoreRadius(radius);
              setGroup({
                id: Date.now().toString(),
                name: groupName,
                leaderId: 'leader-me',
                radiusMeters: radius,
                createdAt: Date.now(),
              });
              setIsTracking(true);
              navigation.navigate('GroupLobby', { groupName, isLeader: true });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Demo Mode Banner ── */}
        {DEMO && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>🎭 DEMO MODE — No Wi-Fi Direct needed</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Knuckles Expedition 2026"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#999"
          />

          <View style={styles.radiusHeader}>
            <Text style={styles.label}>Safe Radius Boundary</Text>
            <Text style={styles.radiusVal}>{radius} meters</Text>
          </View>
          <Text style={styles.desc}>
            An automatic alert banner will fire and devices will vibrate/sound if members exceed this distance.
          </Text>

          <View style={styles.radiusGrid}>
            {[25, 50, 75, 100].map((r) => {
              const active = radius === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusCard, active ? styles.radiusCardActive : null]}
                  onPress={() => setRadius(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radiusNum, active ? styles.radiusNumActive : null]}>
                    {r}m
                  </Text>
                  <Text style={[styles.radiusLabel, active ? styles.radiusLabelActive : null]}>
                    {r === 25 ? 'Close' : r === 50 ? 'Standard' : r === 75 ? 'Far' : 'Max Limit'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.flexFiller} />

          <TouchableOpacity style={styles.startBtn} onPress={handleStart} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnIcon}>🚀</Text>
                <Text style={styles.btnText}>Start Hosting Group</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
  backBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  formContainer: {
    flex: 1,
    marginTop: 28,
    paddingBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    color: '#1E293B',
    marginBottom: 28,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  radiusVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  radiusGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  radiusCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  radiusCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
  },
  radiusNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  radiusNumActive: {
    color: colors.primary,
  },
  radiusLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  radiusLabelActive: {
    color: colors.primary,
  },
  flexFiller: {
    flex: 1,
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnIcon: {
    fontSize: 20,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  demoBanner: {
    backgroundColor: '#6C3FC5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 0,
    marginBottom: 12,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
