// src/screens/TrackingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Alert,
  TextInput,
  Switch,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { wifiDirectManager } from '../services/wifiDirectManager';
import { alertManager } from '../services/alertManager';
import { useLocation } from '../hooks/useLocation';
import { useGeofence } from '../hooks/useGeofence';
import { useCompass } from '../hooks/useCompass';
import { isDemoMode } from '../utils/isDemoMode';
import { stopDemo } from '../services/demoService';
import { firestoreService } from '../services/firestoreService';
import { SOSOverlay } from '../components/SOSOverlay';
import { sendSOS } from '../services/sosService';
import {
  calculateDistance,
  calculateBearing,
  getCardinalDirection,
  getRadarRingIndex,
} from '../utils/geofence';
import { getRadarHeading, isPhoneFacingHeadingSource } from '../utils/heading';

const DEMO = isDemoMode();


export function TrackingScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'tracking' | 'messages' | 'emergency' | 'alerts' | 'profile'>('tracking');
  const [inputText, setInputText] = useState('');
  
  // Zustand State
  const group = useTrackingStore((state) => state.group);
  const members = useTrackingStore((state) => state.members);
  const myLocation = useTrackingStore((state) => state.myLocation);
  const radiusMeters = useTrackingStore((state) => state.radiusMeters) || 50;
  const role = useTrackingStore((state) => state.role);
  const resetTracking = useTrackingStore((state) => state.resetTracking);
  const messages = useTrackingStore((state) => state.messages);
  const addMessage = useTrackingStore((state) => state.addMessage);
  const alerts = useTrackingStore((state) => state.alerts);
  const markAlertsRead = useTrackingStore((state) => state.markAlertsRead);
  const triggerSOS = useTrackingStore((state) => state.triggerSOS);
  const myDeviceId = useTrackingStore((state) => state.myDeviceId);
  const addAlert = useTrackingStore((state) => state.addAlert);
  const setMeetupPoint = useTrackingStore((state) => state.setMeetupPoint);
  const isTracking = useTrackingStore((state) => state.isTracking);
  const connectionStatus = useTrackingStore((state) => state.connectionStatus);
  const allowExitRef = useRef(false);

  const { user } = useAuthStore();
  const guestDefault = `Guest (${Platform.OS === 'android' ? (Platform.constants as any)?.Model || 'Traveler' : 'Traveler'})`;
  const userName = user?.displayName || user?.email?.split('@')[0] || guestDefault;
  const userEmail = user?.email || 'guest@traveltrack.app';

  const settings = useSettingsStore();
  const soundEnabled = settings?.soundEnabled ?? true;
  const vibrationEnabled = settings?.vibrationEnabled ?? true;
  const toggleSound = settings?.toggleSound ?? (() => {});
  const toggleVibration = settings?.toggleVibration ?? (() => {});

  // Start GPS tracking, geofence monitoring, and reconnection coordinator
  const { startTracking, stopTracking } = useLocation();
  useGeofence(); // Actively monitors distances and triggers out-of-range alerts
  const compass = useCompass(); // Phone orientation when supported; GPS course is informational only

  // Radar Animation
  const radarAnim = useRef(new Animated.Value(0)).current;
  // SOS Glow Animation
  const glowAnim = useRef(new Animated.Value(1)).current;
  const chatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // In demo mode GPS is simulated by demoService — skip real GPS tracking
    if (!DEMO) {
      void startTracking().catch((error) => {
        useTrackingStore.getState().setConnectionStatus('degraded');
        Alert.alert(
          'Location sharing did not start',
          `${error?.message || 'Foreground location tracking is unavailable.'}\n\nYour device is not currently sending live GPS. Leave the group safely or fix permissions before relying on tracking.`
        );
      });
    }

    // Radar rotation
    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // SOS pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      if (DEMO) {
        stopDemo();
      } else {
        stopTracking();
      }
    };
  }, []);

  // When switching to alerts tab, mark them all as read
  useEffect(() => {
    if (activeTab === 'alerts' && markAlertsRead) {
      markAlertsRead();
    }
  }, [activeTab]);

  // An END_GROUP message clears the member store. Do not leave a member on a
  // radar whose local group no longer exists.
  useEffect(() => {
    if (!isTracking) {
      allowExitRef.current = true;
      navigation.replace('Home');
    }
  }, [isTracking, navigation]);

  const spin = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate badge counts
  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  // Real members from the store — the current device is always centered, so
  // exclude its echoed GROUP_STATE entry to avoid showing it twice.
  const displayMembers = members.filter((m) => m.id !== myDeviceId).map((m, idx) => {
    const isLeaderDevice = Boolean(m.isLeader || (group?.leaderId && m.id === group.leaderId));

    // Use the latest valid position, retaining the last one after a member
    // leaves Wi-Fi Direct range so the leader keeps an actionable direction.
    const targetLat = Number.isFinite(m.latitude) && Number.isFinite(m.longitude)
      ? m.latitude
      : m.lastKnownLatitude;
    const targetLng = Number.isFinite(m.latitude) && Number.isFinite(m.longitude)
      ? m.longitude
      : m.lastKnownLongitude;

    const rawHasLocation = Boolean(
      myLocation &&
      Number.isFinite(targetLat) &&
      Number.isFinite(targetLng) &&
      !(targetLat === 0 && targetLng === 0)
    );
    const gpsDistance = rawHasLocation
      ? calculateDistance(myLocation!.latitude, myLocation!.longitude, targetLat!, targetLng!)
      : 0;
    const accuracyMargin = Math.round(Math.max(0, myLocation?.accuracy || 0) + Math.max(0, m.accuracy || 0));
    const now = Date.now();
    const sourceFixTime = m.sourceFixReceivedAt || m.lastKnownTimestamp || 0;
    const ageSeconds = sourceFixTime ? Math.round(Math.max(0, now - sourceFixTime) / 1000) : Infinity;
    const isLive = ageSeconds <= 30 && m.connectionState !== 'disconnected';
    const isStale = ageSeconds > 30 && ageSeconds <= 120 && m.connectionState !== 'disconnected';
    const isOffline = ageSeconds > 120 || m.connectionState === 'disconnected';

    // A peer remains visible on the radar up to 2 minutes after last packet arrival.
    // Keep stale coordinates in member metadata, but do not plot an offline
    // coordinate as though it were a current radar position.
    const hasLocation = rawHasLocation && !isOffline;
    const hasReliableBearing = hasLocation && gpsDistance > accuracyMargin && isLive;

    const bearing = rawHasLocation
      ? calculateBearing(myLocation!.latitude, myLocation!.longitude, targetLat!, targetLng!)
      : 0;

    let cardinal = 'GPS uncertain';
    if (isOffline) {
      cardinal = 'Last known position';
    } else if (isStale) {
      cardinal = `Stale (${ageSeconds}s ago)`;
    } else if (hasReliableBearing) {
      cardinal = getCardinalDirection(bearing);
    }

    const ringIndex = getRadarRingIndex(gpsDistance, radiusMeters);

    // Icon assignment:
    // Leader: 👑 (only if this member is the group leader!)
    // Joined members: 👨, 👩, 🧑, 👧, 👵 (never crown!)
    const avatarEmoji = isLeaderDevice ? '👑' : ['👨', '👩', '🧑', '👧', '👵'][idx % 5];

    return {
      id: m.id,
      name: m.name,
      distance: Math.round(gpsDistance),
      accuracyMargin,
      hasLocation,
      isLive,
      isStale,
      isOffline,
      ageSeconds,
      status: m.status,
      emoji: avatarEmoji,
      isLeader: isLeaderDevice,
      bearing,
      cardinal,
      ringIndex,
      lastKnownTime: m.lastKnownTimestamp || m.lastSeen,
      hasReliableBearing,
    };
  });

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
          onPress: async () => {
            if (role === 'leader') {
              try {
                if (group) tcpSocketManager.broadcast({
                  type: 'END_GROUP', groupId: group.id, sessionId: group.sessionId,
                  joinToken: group.joinToken, timestamp: Date.now(),
                });
                // Give buffered TCP writes a chance to reach members before the
                // Group Owner and server are stopped.
                await new Promise<void>((resolve) => setTimeout(resolve, 250));
              } catch (error) {
                console.warn('Could not notify all members that the group ended:', error);
              }
            }
            if (role === 'leader' && user && group) {
              try {
                await firestoreService.saveTripAndIncrementCount(user.uid, {
                  groupName: group.name,
                  startTime: group.createdAt,
                  endTime: Date.now(),
                  memberCount: members.filter((member) => member.id !== myDeviceId).length + 1,
                });
              } catch (error) {
                console.warn('Could not save completed trip:', error);
                Alert.alert(
                  'Trip History Not Saved',
                  'Tracking has ended, but this trip could not be saved to the account. Check your connection before ending future trips.'
                );
              }
            }
            tcpSocketManager.disconnect();
            tcpSocketManager.stopServer();
            await wifiDirectManager.leaveGroup();
            if (resetTracking) resetTracking();
            allowExitRef.current = true;
            navigation.replace('Home');
          },
        },
      ]
    );
  };

  const hasPhoneFacingCompass = isPhoneFacingHeadingSource(compass.source);
  const effectiveCompassHeading = getRadarHeading(compass.source, compass.heading);

  useEffect(() => navigation.addListener('beforeRemove', (event: any) => {
    if (allowExitRef.current || !isTracking) return;
    event.preventDefault();
    Alert.alert('Tracking is still active', 'Use “End Trip” or “Leave Group” so sockets, GPS, and the foreground notification are closed safely.');
  }), [navigation, isTracking]);

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

  // ----- Chat send function -----
  const handleSendChat = () => {
    if (!inputText.trim()) return;

    const payload = {
      senderId: myDeviceId,
      senderName: 'You',
      text: inputText,
    };

    if (addMessage) {
      addMessage(payload);
    }

    try {
      if (tcpSocketManager) {
        if (!group) return;
        const payloadData = {
          type: 'CHAT',
          groupId: group.id,
          sessionId: group.sessionId,
          joinToken: group.joinToken,
          memberId: myDeviceId,
          memberName: userName,
          message: inputText,
          timestamp: Date.now(),
        };

        if (role === 'leader' && tcpSocketManager.broadcast) {
          tcpSocketManager.broadcast(payloadData);
        } else if (role === 'member' && tcpSocketManager.send) {
          tcpSocketManager.send(payloadData);
        }
      }
    } catch (e) {
      console.warn('TCP messaging transmit failed, continuing locally.', e);
    }

    setInputText('');
    setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // ----- Meetup Point broadcast function -----
  const handleSendMeetup = () => {
    if (!myLocation) {
      Alert.alert('Location Not Available', 'Your GPS location has not been acquired yet. Please wait.');
      return;
    }

    Alert.prompt
      ? Alert.prompt(
          '📌 Set Meetup Point',
          'Enter a name for the meetup location:',
          (meetupName) => {
            if (!meetupName?.trim()) return;
            broadcastMeetup(meetupName.trim());
          },
          'plain-text',
          '',
          'default'
        )
      : // Fallback for Android (no Alert.prompt)
        broadcastMeetup('Meetup Point');
  };

  const broadcastMeetup = (meetupName: string) => {
    const meetup = {
      name: meetupName,
      latitude: myLocation!.latitude,
      longitude: myLocation!.longitude,
      setBy: userName,
      timestamp: Date.now(),
    };

    // Save locally
    setMeetupPoint(meetup);
    addAlert({
      type: 'meetup',
      memberName: userName,
      message: `You set meetup point: "${meetupName}"`,
    });

    // Broadcast over TCP
    try {
      if (!group) return;
      const payload = {
        type: 'MEETUP_POINT',
        groupId: group.id,
        sessionId: group.sessionId,
        joinToken: group.joinToken,
        ...meetup,
      };
      let sent = false;
      if (role === 'leader' && tcpSocketManager.broadcast) {
        sent = tcpSocketManager.broadcast(payload) > 0;
      } else if (role === 'member' && tcpSocketManager.send) {
        sent = tcpSocketManager.send(payload);
      }
      Alert.alert(sent ? 'Meetup sent' : 'Meetup saved locally', sent
        ? `Meetup point "${meetupName}" was sent over the offline group connection.`
        : 'No connected group device confirmed the transmission.');
    } catch (e) {
      console.warn('Failed to broadcast meetup point:', e);
    }
  };

  // ----- SOS send function -----
  const handleSOS = () => {
    const result = sendSOS();
    Alert.alert(result.sent ? 'SOS transmission started' : 'SOS not delivered', result.message);
  };

  // Renders the appropriate layout based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracking':
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {connectionStatus !== 'connected' && (
              <View style={styles.connectionWarning}>
                <Text style={styles.connectionWarningText}>
                  {connectionStatus === 'reconnecting' ? 'Reconnecting to the original group leader…' : 'Offline connection degraded. Positions shown may be last known.'}
                </Text>
              </View>
            )}
            {/* Horizontal Active Friends Carousel */}
            <View style={styles.activeFriendsCard}>
              <View style={styles.friendsHeader}>
                <Text style={styles.friendsTitle}>Active Group Members</Text>
              <Text style={styles.friendsCount}>{displayMembers.filter((member) => member.isLive).length + 1} online</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsListScroll}>
                {/* Own Device Avatar (Green Dot 🟢) */}
                <View style={styles.friendAvatarWrapper}>
                  <View style={[styles.avatarCircle, { borderColor: colors.safe, backgroundColor: '#E6F4EA' }]}>
                    <Text style={styles.avatarEmoji}>🟢</Text>
                    {role === 'leader' && <Text style={styles.ownLeaderBadge}>👑</Text>}
                  </View>
                  <Text style={styles.friendName}>You</Text>
                </View>
                {displayMembers.map((m) => (
                  <View key={m.id} style={styles.friendAvatarWrapper}>
                    <View style={[styles.avatarCircle, { borderColor: getStatusColor(m.status) }]}>
                      <Text style={styles.avatarEmoji}>{m.emoji}</Text>
                    </View>
                    <Text style={styles.friendName} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                    {m.hasLocation && (
                      <Text style={{ fontSize: 9, color: '#64748B', textAlign: 'center' }}>
                        ~{m.distance}m {m.cardinal}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Circular Radar Visualizer (acting as geofence map) */}
            <View style={styles.radarCard}>
              <View style={styles.radarHeaderInfo}>
                <Text style={styles.radarTitle}>📍 Group Safety Radar</Text>
                <Text style={styles.radarSubtitle}>
                  {hasPhoneFacingCompass
                    ? `🧭 ${compass.statusText}: ${compass.heading}° (${getCardinalDirection(compass.heading)}) • Safe radius: ${radiusMeters}m`
                    : compass.source === 'gps-course'
                      ? `🧭 Compass unavailable • North-Up • GPS course: ${compass.heading}° (${getCardinalDirection(compass.heading)}) • Safe radius: ${radiusMeters}m`
                      : `🧭 ${compass.statusText} • North-Up • Safe radius: ${radiusMeters}m`}
                </Text>
              </View>

              <View style={styles.radarContainer}>
                <View style={styles.radarOuterCircle}>
                  {/* Rotate only from a true phone-orientation sensor; otherwise remain north-up. */}
                  {(() => {
                    const devHeading = effectiveCompassHeading;
                    // Angles for N (0°), E (90°), S (180°), W (270°) relative to device heading
                    const getCardPos = (targetAngle: number, radius: number = 105) => {
                      const relAngle = targetAngle - devHeading;
                      const rad = (relAngle * Math.PI) / 180;
                      return {
                        x: radius * Math.sin(rad),
                        y: -radius * Math.cos(rad),
                      };
                    };
                    const nPos = getCardPos(0);
                    const ePos = getCardPos(90);
                    const sPos = getCardPos(180);
                    const wPos = getCardPos(270);

                    return (
                      <>
                        <Text style={[styles.cardinalText, { transform: [{ translateX: nPos.x }, { translateY: nPos.y }] }]}>N</Text>
                        <Text style={[styles.cardinalText, { transform: [{ translateX: ePos.x }, { translateY: ePos.y }] }]}>E</Text>
                        <Text style={[styles.cardinalText, { transform: [{ translateX: sPos.x }, { translateY: sPos.y }] }]}>S</Text>
                        <Text style={[styles.cardinalText, { transform: [{ translateX: wPos.x }, { translateY: wPos.y }] }]}>W</Text>
                      </>
                    );
                  })()}

                  {/* Concentric Distance Rings */}
                  <View style={styles.radarMiddleCircle} />
                  <View style={styles.radarInnerCircle} />
                  
                  {/* Animated Sweep Line */}
                  <Animated.View style={[styles.radarSweep, { transform: [{ rotate: spin }] }]} />

                  {/* The arrow is truthful only when a phone-facing heading exists. */}
                  <View style={styles.ownCenterDot}>
                    {hasPhoneFacingCompass && (
                      <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: 'bold' }}>▲</Text>
                    )}
                    <Text style={styles.ownDotEmoji}>🟢</Text>
                    {role === 'leader' && <Text style={styles.ownLeaderBadge}>👑</Text>}
                  </View>

                  {/* GPS distance sets the ring. Direction is phone-relative only with a real compass. */}
                  {displayMembers.filter((m) => m.hasLocation).map((m) => {
                    let visualDist = 0;
                    if (m.status === 'out_of_range' || m.distance > radiusMeters) {
                      visualDist = 104; // Placed at outer edge boundary
                    } else if (m.ringIndex === 1) {
                      visualDist = 14 + (m.distance / (radiusMeters * 0.33)) * 22; // Inner Ring
                    } else if (m.ringIndex === 2) {
                      visualDist = 38 + ((m.distance - radiusMeters * 0.33) / (radiusMeters * 0.33)) * 30; // Mid Ring
                    } else {
                      visualDist = 70 + ((m.distance - radiusMeters * 0.66) / (radiusMeters * 0.34)) * 28; // Outer Ring
                    }
                    
                    // Convert target bearing relative to device heading to screen offsets (0° = Top of screen = -Y)
                    const relBearing = m.bearing - effectiveCompassHeading;
                    const radAngle = (relBearing * Math.PI) / 180;
                    const xOffset = visualDist * Math.sin(radAngle);
                    const yOffset = -visualDist * Math.cos(radAngle);

                    const isOutOfRange = m.status === 'out_of_range';

                    return (
                      <View
                        key={m.id}
                        style={[
                          styles.memberRadarDot,
                          {
                            transform: [{ translateX: xOffset }, { translateY: yOffset }],
                            backgroundColor: getStatusColor(m.status),
                            borderColor: isOutOfRange ? '#EF4444' : '#FFFFFF',
                            borderWidth: isOutOfRange ? 2.5 : 2,
                            opacity: m.isStale ? 0.45 : (m.hasReliableBearing ? 1 : 0.75),
                          },
                        ]}
                      >
                        <Text style={styles.memberRadarDotEmoji}>{m.emoji}</Text>
                        {isOutOfRange ? (
                          <View style={styles.lostBadgeContainer}>
                            <Text style={styles.lostBadgeText}>Outside • {m.cardinal}</Text>
                          </View>
                        ) : m.isStale ? (
                          <View style={[styles.lostBadgeContainer, { backgroundColor: 'rgba(234, 179, 8, 0.9)' }]}>
                            <Text style={styles.lostBadgeText}>Stale {m.ageSeconds}s</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Magnetometer Confidence & Radar Ring Legend */}
              {compass.source === 'magnetometer' && !compass.isCalibrated && (
                <Text style={[styles.radarAccuracyNote, { color: '#D97706', fontWeight: '600' }]}>
                  ⚠️ {compass.statusText}
                </Text>
              )}
              <Text style={styles.radarAccuracyNote}>
                {hasPhoneFacingCompass
                  ? 'Up arrow (▲) indicates the direction your phone is physically facing. Rotating your phone rotates the radar map.'
                  : compass.source === 'gps-course'
                    ? 'Compass hardware is unavailable. Radar stays North-Up; GPS course shows movement direction only, not phone-facing direction.'
                    : 'Compass hardware is unavailable. Radar stays North-Up, with member positions shown by their GPS direction from north.'}
              </Text>
              <View style={styles.radarLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(10, 74, 109, 0.4)' }]} />
                  <Text style={styles.legendText}>Ring 1: Inner</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(10, 74, 109, 0.25)' }]} />
                  <Text style={styles.legendText}>Ring 2: Mid</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Ring 3: Outer ({radiusMeters}m)</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Panel */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.sosActionBtn}
                onPress={() => setActiveTab('emergency')}
              >
                <Text style={styles.actionBtnIcon}>🚨</Text>
                <Text style={styles.actionBtnTextSOS}>SOS Alert</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'messages':
        const displayMessages = messages.map(msg => ({
          id: msg.id,
          senderName: msg.senderName,
          text: msg.text,
          mine: msg.senderId === myDeviceId,
        }));

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatWrapper}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
          >
            <FlatList
              ref={chatListRef}
              data={displayMessages}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 12 }}
              onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={{ flex: 1, paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#94A3B8' }}>💬 No messages in group chat yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.msgRow, item.mine ? styles.msgRowMine : styles.msgRowOther]}>
                  {!item.mine && <Text style={styles.msgSenderName}>{item.senderName}</Text>}
                  <View style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, item.mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              )}
            />
            {/* Input bar */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLeftIcons}>
                <TouchableOpacity style={styles.inputIconBtn}><Text style={styles.inputIcon}>😊</Text></TouchableOpacity>
              </View>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Type a message..."
                placeholderTextColor="#64748B"
                value={inputText}
                onChangeText={setInputText}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
                <Text style={styles.sendIcon}>➔</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        );

      case 'emergency':
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Send SOS group card */}
            <View style={styles.sosCard}>
              <Animated.View style={[styles.sosButtonGlow, { transform: [{ scale: glowAnim }] }]} />
              <TouchableOpacity style={styles.bigSosBtn} onPress={handleSOS} activeOpacity={0.9}>
                <Text style={styles.bigSosIcon}>SOS</Text>
              </TouchableOpacity>
              <Text style={styles.sosCardTitle}>Send SOS to Group</Text>
              <Text style={styles.sosCardDesc}>
                Instantly notify all group members with your current location
              </Text>
            </View>

            {/* Emergency contacts grid */}
            <Text style={styles.sosHeader}>Emergency Services</Text>
            
            {[
              { title: 'Emergency Services', sub: 'National helpline Assistance', number: '119', icon: '🚨' },
              { title: 'Police', sub: 'Direct police headquarters dispatch', number: '119', icon: '🚓' },
              { title: 'Ambulance', sub: 'Hospital and emergency rescue service', number: '1990', icon: '🚑' },
              { title: 'Fire Department', sub: 'Fire emergency and safety response', number: '110', icon: '🚒' }
            ].map((contact, index) => (
              <View key={index} style={styles.emergencyRow}>
                <View style={styles.emergencyIconBg}>
                  <Text style={styles.emergencyRowEmoji}>{contact.icon}</Text>
                </View>
                <View style={styles.emergencyDetails}>
                  <Text style={styles.emergencyTitleText}>{contact.title}</Text>
                  <Text style={styles.emergencySubText}>{contact.sub}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.emergencyCallBtn}
                  onPress={() => Alert.alert('Call', `Calling ${contact.title}: ${contact.number}`)}
                >
                  <Text style={styles.emergencyCallIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        );

        const displayAlerts = alerts;

        const getAlertIcon = (type: string) => {
          switch (type) {
            case 'out_of_range':
            case 'sos':
              return '⚠️';
            case 'meetup':
              return '📍';
            case 'returned':
              return '🟢';
            default:
              return '🔔';
          }
        };

        const getAlertIconColor = (type: string) => {
          switch (type) {
            case 'out_of_range':
            case 'sos':
              return '#EF4444';
            case 'meetup':
              return '#0A4A6D';
            case 'returned':
              return '#10B981';
            default:
              return '#64748B';
          }
        };

        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            <View style={styles.alertsHeaderWrapper}>
              <Text style={styles.alertsCountText}>
                {alerts.length} notifications
              </Text>
            </View>

            {displayAlerts.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, color: '#94A3B8' }}>🔔 No activity alerts logged yet.</Text>
              </View>
            ) : (
              displayAlerts.map((alert) => {
                const minutesAgo = Math.max(1, Math.round((Date.now() - alert.timestamp) / (1000 * 60)));
                const timeString = minutesAgo < 60 ? `${minutesAgo} min ago` : `${Math.round(minutesAgo/60)} hours ago`;

                return (
                  <View key={alert.id} style={styles.alertCard}>
                    <View style={[styles.alertIconCircle, { backgroundColor: getAlertIconColor(alert.type) + '15' }]}>
                      <Text style={{ fontSize: 18 }}>{getAlertIcon(alert.type)}</Text>
                    </View>
                    <View style={styles.alertCardDetails}>
                      <Text style={styles.alertCardTitle}>{alert.type === 'out_of_range' ? 'Member Outside Radius' : alert.type === 'meetup' ? 'New Meetup Point' : 'Alert'}</Text>
                      <Text style={styles.alertCardText}>{alert.message}</Text>
                      <Text style={styles.alertTime}>{timeString}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        );

      case 'profile':
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Header Banner Gradient */}
            <LinearGradient
              colors={['#0A4A6D', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileBanner}
            >
              <View style={styles.profileAvatarCircle}>
                <Text style={styles.profileAvatarEmoji}>👤</Text>
              </View>
            </LinearGradient>

            <View style={styles.profileInfoBlock}>
              <Text style={styles.profileNameText}>{userName}</Text>
              <Text style={styles.profileEmailText}>{userEmail}</Text>
            </View>

            {/* Stats Block */}
              <View style={styles.statsCardGrid}>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridVal}>{members.filter((member) => member.id !== myDeviceId).length + 1}</Text>
                  <Text style={styles.statGridLabel}>Members</Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridVal}>{radiusMeters}m</Text>
                  <Text style={styles.statGridLabel}>Safe Radius</Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridVal}>{role === 'leader' ? 'Host' : 'Member'}</Text>
                  <Text style={styles.statGridLabel}>Group Role</Text>
                </View>
            </View>

            {/* Settings Toggles List */}
            <Text style={styles.profileSectionTitle}>Settings</Text>
            <View style={styles.settingsGroupCard}>
              <View style={styles.settingListItem}>
                <View style={styles.settingItemLeft}>
                  <Text style={styles.settingItemIcon}>🔔</Text>
                  <View>
                    <Text style={styles.settingItemLabel}>Sound Alerts</Text>
                    <Text style={styles.settingItemDesc}>Not available in this build</Text>
                  </View>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={toggleSound}
                  disabled
                  trackColor={{ false: '#CBD5E1', true: 'rgba(10, 74, 109, 0.5)' }}
                  thumbColor={soundEnabled ? '#0A4A6D' : '#F8F9FA'}
                />
              </View>

              <View style={styles.settingItemDivider} />

              <View style={styles.settingListItem}>
                <View style={styles.settingItemLeft}>
                  <Text style={styles.settingItemIcon}>📳</Text>
                  <View>
                    <Text style={styles.settingItemLabel}>Vibration Alerts</Text>
                    <Text style={styles.settingItemDesc}>Vibrate device on boundary warning</Text>
                  </View>
                </View>
                <Switch
                  value={vibrationEnabled}
                  onValueChange={toggleVibration}
                  trackColor={{ false: '#CBD5E1', true: 'rgba(10, 74, 109, 0.5)' }}
                  thumbColor={vibrationEnabled ? '#0A4A6D' : '#F8F9FA'}
                />
              </View>

              <View style={styles.settingItemDivider} />

              {[
                { title: 'Account Settings', icon: '👤' },
                { title: 'Location Services', icon: '📍' },
                { title: 'Privacy & Safety', icon: '🛡️' }
              ].map((item, index) => (
                <View key={index}>
                  <TouchableOpacity style={styles.settingListItemBtn}>
                    <View style={styles.settingItemLeft}>
                      <Text style={styles.settingItemIcon}>{item.icon}</Text>
                      <Text style={styles.settingItemLabelBtn}>{item.title}</Text>
                    </View>
                    <Text style={styles.arrowIcon}>➔</Text>
                  </TouchableOpacity>
                  {index < 2 && <View style={styles.settingItemDivider} />}
                </View>
              ))}
            </View>

            <View style={styles.aboutContainer}>
              <Text style={styles.aboutTitle}>TravelTrack v1.0.0</Text>
              <Text style={styles.aboutDesc}>Keep your group safe with offline real-time location P2P technology.</Text>
            </View>
          </ScrollView>
        );
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'tracking':
        return group?.name || 'TravelTrack';
      case 'messages':
        return 'Messages';
      case 'emergency':
        return 'Emergency Center';
      case 'alerts':
        return 'Notifications';
      case 'profile':
        return 'Profile';
      default:
        return 'TravelTrack';
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'tracking':
        return myLocation
          ? `GPS accuracy ±${Math.round(myLocation.accuracy || 0)}m`
          : 'Waiting for a GPS fix';
      case 'messages':
        return 'chat with your friends';
      case 'emergency':
        return 'Quick access to help';
      case 'alerts':
        return `${unreadAlertsCount} unread notifications`;
      case 'profile':
        return userName;
      default:
        return 'Travel Together, Stay Safe';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A4A6D" />
      
      {/* Universal Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerMenuIcon}>☰</Text>
          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndTracking}>
          <Text style={styles.endBtnText}>{role === 'leader' ? 'End' : 'Leave'}</Text>
        </TouchableOpacity>
      </View>

      {/* Demo Mode Banner */}
      {DEMO && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>🎭 DEMO MODE — Simulated group with live GPS movement</Text>
        </View>
      )}

      {/* Main Tab Render Container */}
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>

      {/* Custom Sticky Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        {[
          { tab: 'tracking', icon: '📍', label: 'Tracking' },
          { tab: 'messages', icon: '💬', label: 'Messages' },
          { tab: 'emergency', icon: '🚨', label: 'Emergency' },
          { tab: 'alerts', icon: '🔔', label: 'Alerts', badge: unreadAlertsCount },
          { tab: 'profile', icon: '👤', label: 'Profile' }
        ].map((t) => {
          const isActive = activeTab === t.tab;
          return (
            <TouchableOpacity
              key={t.tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(t.tab as any)}
            >
              <View style={styles.tabIconWrapper}>
                <Text style={[styles.tabIcon, isActive ? styles.tabIconActive : styles.tabIconInactive]}>
                  {t.icon}
                </Text>
                {t.badge && t.badge > 0 ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{t.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ✅ SOS Overlay — shows full-screen red alert when another device sends SOS */}
      <SOSOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  connectionWarning: { backgroundColor: '#FFF7ED', borderColor: '#FB923C', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  connectionWarningText: { color: '#9A3412', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#0A4A6D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerMenuIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerTitleWrapper: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontWeight: '500',
  },
  endBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  endBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabScroll: {
    flex: 1,
  },

  // ----- Tab 1: Tracking Styles -----
  activeFriendsCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  friendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  friendsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  friendsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  friendsListScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  friendAvatarWrapper: {
    alignItems: 'center',
    width: 60,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  friendName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 6,
    textAlign: 'center',
  },
  radarCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    paddingVertical: 20,
  },
  radarHeaderInfo: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  radarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A4A6D',
  },
  radarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  radarAccuracyNote: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarOuterCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 74, 109, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(10, 74, 109, 0.02)',
  },
  radarMiddleCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(10, 74, 109, 0.1)',
  },
  radarInnerCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(10, 74, 109, 0.08)',
  },
  radarSweep: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRightWidth: 1.5,
    borderColor: 'rgba(10, 74, 109, 0.25)',
    borderTopLeftRadius: 110,
    transformOrigin: 'bottom right',
    right: '50%',
    bottom: '50%',
    backgroundColor: 'transparent',
  },
  ownCenterDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 32,
    height: 32,
    marginTop: -16,
    marginLeft: -16,
    borderRadius: 16,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  ownDotEmoji: {
    fontSize: 14,
  },
  ownLeaderBadge: {
    position: 'absolute',
    top: -8,
    right: -6,
    fontSize: 12,
  },
  cardinalText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    marginTop: -10,
    marginLeft: -10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  cardinalN: { top: 4 },
  cardinalE: { right: 8 },
  cardinalS: { bottom: 4 },
  cardinalW: { left: 8 },
  memberRadarDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 28,
    height: 28,
    marginTop: -14,
    marginLeft: -14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  memberRadarDotEmoji: {
    fontSize: 13,
  },
  lostBadgeContainer: {
    position: 'absolute',
    top: -18,
    minWidth: 64,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    alignItems: 'center',
    zIndex: 10,
  },
  lostBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  radarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  sosActionBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnTextSOS: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ----- Tab 2: Messages Styles -----
  chatWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  msgRow: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  msgRowMine: {
    alignSelf: 'flex-end',
  },
  msgRowOther: {
    alignSelf: 'flex-start',
  },
  msgSenderName: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: '#0A4A6D',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  bubbleTextOther: {
    color: '#1E293B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputLeftIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  inputIconBtn: {
    padding: 4,
  },
  inputIcon: {
    fontSize: 20,
  },
  chatTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#1E293B',
    fontSize: 14,
    marginHorizontal: 12,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A4A6D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ----- Tab 3: Emergency Styles -----
  sosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  sosButtonGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    top: 24,
  },
  bigSosBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
    zIndex: 1,
  },
  bigSosIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  sosCardDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  sosHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  emergencyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emergencyRowEmoji: {
    fontSize: 20,
  },
  emergencyDetails: {
    flex: 1,
  },
  emergencyTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  emergencySubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emergencyCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyCallIcon: {
    color: '#0A4A6D',
    fontSize: 14,
  },

  // ----- Tab 4: Alerts Styles -----
  alertsHeaderWrapper: {
    marginBottom: 16,
  },
  alertsCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  alertIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  alertCardDetails: {
    flex: 1,
  },
  alertCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  alertCardText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  alertTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
  },

  // ----- Tab 5: Profile Styles -----
  profileBanner: {
    height: 130,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 56,
  },
  profileAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E2E8F0',
    borderWidth: 3,
    borderColor: '#ffffff',
    position: 'absolute',
    bottom: -44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileAvatarEmoji: {
    fontSize: 44,
  },
  profileInfoBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  profileEmailText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statsCardGrid: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  statGridVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A4A6D',
  },
  statGridLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  settingsGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  settingListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingListItemBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemIcon: {
    fontSize: 18,
    color: '#64748B',
  },
  settingItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingItemLabelBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  settingItemDivider: {
    height: 1.5,
    backgroundColor: '#E2E8F0',
  },
  arrowIcon: {
    color: '#64748B',
    fontSize: 12,
  },
  aboutContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 30,
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  aboutDesc: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // -----sticky Bottom Tab bar-----
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 84 : 68,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapper: {
    position: 'relative',
    height: 24,
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabIconActive: {
    color: '#0A4A6D',
  },
  tabIconInactive: {
    color: '#94A3B8',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#0A4A6D',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#94A3B8',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#FF6B35',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  demoBanner: {
    backgroundColor: '#6C3FC5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
