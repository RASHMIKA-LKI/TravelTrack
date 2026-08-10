// src/screens/GroupLobbyScreen.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { isDemoMode } from '../utils/isDemoMode';
import QRCode from 'react-native-qrcode-svg';

const DEMO = isDemoMode();

export function GroupLobbyScreen({ navigation, route }: any) {
  const { groupName, isLeader } = route.params || {};

  const storeMembers = useTrackingStore((state) => state.members);
  const isTracking = useTrackingStore((state) => state.isTracking);
  const setIsTracking = useTrackingStore((state) => state.setIsTracking);
  const resetTracking = useTrackingStore((state) => state.resetTracking);
  const role = useTrackingStore((state) => state.role);
  const myDeviceId = useTrackingStore((state) => state.myDeviceId);
  const group = useTrackingStore((state) => state.group);

  const localMember = {
    id: myDeviceId,
    name: isLeader ? 'You • Leader' : 'You',
    status: 'safe' as const,
    isMe: true,
  };
  const displayMembers = [
    localMember,
    ...storeMembers.filter((m) => m.id !== myDeviceId).map(m => ({
    id: m.id,
    name: m.name,
    status: m.status,
    isMe: false,
  })),
  ];

  // Watch for tracking state change (members navigate automatically when leader triggers start)
  useEffect(() => {
    if (!isLeader && isTracking) {
      navigation.replace('Tracking');
    }
  }, [isTracking, isLeader]);

  const handleStartTracking = () => {
    if (setIsTracking) {
      setIsTracking(true);
    }

    // ✅ BUG FIX: Broadcast START_TRACKING to all connected members so they navigate too
    try {
      tcpSocketManager.broadcast({ type: 'START_TRACKING', timestamp: Date.now() });
    } catch (e) {
      console.warn('Failed to broadcast START_TRACKING:', e);
    }

    // Navigate leader to TrackingScreen
    navigation.replace('Tracking');
  };

  const handleLeaveLobby = async () => {
    try {
      if (isLeader) {
        tcpSocketManager.broadcast({ type: 'END_GROUP', timestamp: Date.now() });
      }
      tcpSocketManager.disconnect();
      tcpSocketManager.stopServer();
      await wifiDirectManager.leaveGroup();
    } catch (error) {
      console.warn('Could not fully close group lobby:', error);
    }
    if (resetTracking) {
      resetTracking();
    }
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeaveLobby} style={styles.leaveBtn}>
            <Text style={styles.leaveText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {groupName || 'Group Lobby'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Demo Mode Banner */}
        {DEMO && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>🎭 DEMO MODE — 3 simulated members connected</Text>
          </View>
        )}

        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>{isLeader ? '👑' : '📶'}</Text>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              {isLeader ? 'You are Hosting' : 'Connected to Host'}
            </Text>
            <Text style={styles.bannerDesc}>
              {isLeader
                ? 'Share your group details. Waiting for members to connect.'
                : 'Stay close to the leader. Tracking starts shortly.'}
            </Text>
          </View>
        </View>

        {/* Leader QR Code Section */}
        {isLeader && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Invite Members via QR Code</Text>
            <Text style={styles.qrSubtitle}>Ask others to scan this code, then select this nearby host to connect.</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={DEMO ? 'DEMO_PEER' : `traveltrack:group:${group?.id || 'active'}`}
                size={130}
                color="#0A4A6D"
                backgroundColor="#ffffff"
              />
            </View>
            <Text style={styles.qrInstructions}>
              QR confirms this invitation. Wi-Fi Direct chooses the nearby host.
            </Text>
          </View>
        )}

        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Connected Members</Text>
            <Text style={styles.countBadge}>{displayMembers.length}</Text>
          </View>

          <FlatList
            data={displayMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {item.name}
                  </Text>
                  <Text style={styles.memberMeta}>{item.isMe ? 'This device' : 'Connected through Wi-Fi Direct'}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Ready</Text>
                </View>
              </View>
            )}
            style={styles.membersList}
          />
        </View>

        {isLeader ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStartTracking}>
            <Text style={styles.startBtnText}>🟢 Start Tracking Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingContainer}>
            <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 10 }} />
            <Text style={styles.waitingText}>Waiting for leader to start tracking...</Text>
          </View>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  leaveBtn: {
    paddingVertical: 8,
    width: 76,
  },
  leaveText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
    minWidth: 0,
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 76,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginVertical: 20,
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  membersSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  countBadge: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    overflow: 'hidden',
  },
  membersList: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  memberMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safe,
    marginRight: 6,
  },
  statusText: {
    color: colors.safe,
    fontSize: 11,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 12,
  },
  waitingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  demoBanner: {
    backgroundColor: '#6C3FC5',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  qrCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  qrTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0A4A6D',
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  qrContainer: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  qrInstructions: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
});
