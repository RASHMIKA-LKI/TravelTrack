// src/screens/GroupLobbyScreen.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';

export function GroupLobbyScreen({ navigation, route }: any) {
  const { groupName, isLeader } = route.params || {};

  const storeMembers = useTrackingStore((state) => state.members);
  const isTracking = useTrackingStore((state) => state.isTracking);
  const setIsTracking = useTrackingStore((state) => state.setIsTracking);
  const resetTracking = useTrackingStore((state) => state.resetTracking);

  // Fallback demo members if store is empty (to see visual styling)
  const fallbackMembers = [
    { id: 'me', name: isLeader ? 'You (Leader)' : 'You', status: 'safe', batteryLevel: 94, isMe: true },
    { id: '2', name: 'Sarah Mendis', status: 'safe', batteryLevel: 88, isMe: false },
    { id: '3', name: 'Mike Perera', status: 'safe', batteryLevel: 72, isMe: false },
  ];

  const displayMembers = storeMembers.length > 0 ? storeMembers.map(m => ({
    id: m.id,
    name: m.name,
    status: m.status,
    batteryLevel: m.batteryLevel,
    isMe: m.id === 'me'
  })) : fallbackMembers;

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
    // Navigate leader to TrackingScreen
    navigation.replace('Tracking');
  };

  const handleLeaveLobby = () => {
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupName || 'Group Lobby'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

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
                    {item.name} {item.isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.memberMeta}>🔋 Battery: {item.batteryLevel}%</Text>
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
  },
  leaveText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
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
    color: '#1A1A1A',
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#666666',
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
    color: '#1A1A1A',
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
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5F2',
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
    color: '#1A1A1A',
  },
  memberMeta: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
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
    backgroundColor: '#F5F5F5',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 12,
  },
  waitingText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
});
