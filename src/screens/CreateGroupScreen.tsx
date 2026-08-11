// src/screens/CreateGroupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { useWifiDirect } from '../hooks/useWifiDirect';
import { isDemoMode } from '../utils/isDemoMode';
import { startDemo } from '../services/demoService';
import { SAFE_RADIUS_METERS } from '../utils/constants';
import { createSessionValue } from '../utils/sessionProtocol';

const DEMO = isDemoMode();

export function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const radius = SAFE_RADIUS_METERS;
  const setRole = useTrackingStore((state) => state.setRole);
  const setGroup = useTrackingStore((state) => state.setGroup);
  const setIsTracking = useTrackingStore((state) => state.setIsTracking);
  const myDeviceId = useTrackingStore((state) => state.myDeviceId);
  const { startHosting } = useWifiDirect();

  const handleStart = async () => {
    const normalizedGroupName = groupName.trim().slice(0, 80);
    if (!normalizedGroupName) {
      Alert.alert('Validation Error', 'Please enter a group name');
      return;
    }

    setLoading(true);

    // ── DEMO MODE ──────────────────────────────────────────────────────────
    if (DEMO) {
      startDemo();
      setGroup({
        id: 'demo-group',
        name: normalizedGroupName || '🗺️ Demo Trip',
        leaderId: myDeviceId,
        radiusMeters: radius,
        createdAt: Date.now(),
        sessionId: 'demo-session',
        joinToken: 'demo-token',
      });
      setLoading(false);
      navigation.navigate('GroupLobby', { groupName: normalizedGroupName || '🗺️ Demo Trip', isLeader: true });
      return;
    }

    try {
      const now = Date.now();
      setRole('leader');
      setGroup({
        id: createSessionValue('group'),
        name: normalizedGroupName,
        leaderId: myDeviceId,
        radiusMeters: radius,
        createdAt: now,
        sessionId: createSessionValue('session'),
        joinToken: createSessionValue('invite'),
      });
      await startHosting();
      setIsTracking(true);

      navigation.navigate('GroupLobby', { groupName: normalizedGroupName, isLeader: true });
    } catch (error: any) {
      useTrackingStore.getState().resetTracking();
      const msg: string = error?.message || 'Unknown error';
      Alert.alert(
        'Wi-Fi Direct Error',
        'Could not start group hosting.\n\n' +
          '• Make sure Wi-Fi is turned ON\n' +
          '• Grant Location + Nearby Devices permissions in Settings\n' +
          '• Toggle Wi-Fi off/on and try again\n\n' +
          'Detail: ' + msg,
        [{ text: 'OK', style: 'cancel' }]
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
            maxLength={80}
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#999"
          />

          <View style={styles.radiusHeader}>
            <Text style={styles.label}>Safe Boundary Radius</Text>
            <Text style={styles.radiusVal}>{radius} meters</Text>
          </View>
          <Text style={styles.desc}>
            Automatic alert banner and sound/vibration alerts will fire whenever group members exceed 50 meters from the leader.
          </Text>

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
