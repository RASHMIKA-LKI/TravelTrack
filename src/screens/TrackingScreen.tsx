// src/screens/TrackingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { tcpSocketManager } from '../services/tcpSocketManager';
import { alertManager } from '../services/alertManager';

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

  const { user } = useAuthStore();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Alex Johnson';
  const userEmail = user?.email || 'alex.johnson@email.com';

  const settings = useSettingsStore();
  const soundEnabled = settings?.soundEnabled ?? true;
  const vibrationEnabled = settings?.vibrationEnabled ?? true;
  const toggleSound = settings?.toggleSound ?? (() => {});
  const toggleVibration = settings?.toggleVibration ?? (() => {});

  // Radar Animation
  const radarAnim = useRef(new Animated.Value(0)).current;
  // SOS Glow Animation
  const glowAnim = useRef(new Animated.Value(1)).current;
  const chatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Start radar rotation
    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Start SOS pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // When switching to alerts tab, mark them all as read
  useEffect(() => {
    if (activeTab === 'alerts' && markAlertsRead) {
      markAlertsRead();
    }
  }, [activeTab]);

  const spin = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate badge counts
  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  // Fallback demo members if store is empty
  const fallbackMembers = [
    { id: '2', name: 'Sarah Mendis', distance: 12, status: 'safe', emoji: '👩', angle: 45, batteryLevel: 88, isMe: false },
    { id: '3', name: 'Mike Perera', distance: 42, status: 'warning', emoji: '👨', angle: 180, batteryLevel: 72, isMe: false },
    { id: '4', name: 'Jack Silva', distance: 68, status: 'out_of_range', emoji: '🧑', angle: 290, batteryLevel: 56, isMe: false },
  ];

  const displayMembers = members.length > 0
    ? members.map((m, idx) => ({
        id: m.id,
        name: m.name,
        distance: m.latitude && myLocation
          ? Math.round(calculateDistance(m.latitude, m.longitude, myLocation.latitude, myLocation.longitude))
          : Math.round(15 + idx * 20),
        status: m.status,
        emoji: ['👩', '👨', '🧑', '👧', '👵'][idx % 5],
        angle: (idx * 110 + 30) % 360,
        batteryLevel: m.batteryLevel || 90,
      }))
    : fallbackMembers;

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

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
          onPress: () => {
            if (resetTracking) resetTracking();
            navigation.replace('Home');
          },
        },
      ]
    );
  };

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
      senderId: 'me',
      senderName: 'You',
      text: inputText,
    };

    if (addMessage) {
      addMessage(payload);
    }

    try {
      if (tcpSocketManager) {
        const payloadData = {
          type: 'CHAT',
          memberId: 'me',
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

  // ----- SOS send function -----
  const handleSOS = () => {
    Alert.alert(
      '🆘 SOS Broadcasted!',
      'Your emergency distress alert and current GPS location have been sent to all group members.',
      [{ text: 'OK' }]
    );

    if (triggerSOS) {
      triggerSOS('You');
    }

    if (alertManager && alertManager.triggerSOSAlert) {
      alertManager.triggerSOSAlert('You', myLocation?.latitude || 0, myLocation?.longitude || 0);
    }
  };

  // Renders the appropriate layout based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracking':
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Horizontal Active Friends Carousel */}
            <View style={styles.activeFriendsCard}>
              <View style={styles.friendsHeader}>
                <Text style={styles.friendsTitle}>Active Friends</Text>
                <Text style={styles.friendsCount}>{displayMembers.length + 1} online</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsListScroll}>
                <View style={styles.friendAvatarWrapper}>
                  <View style={[styles.avatarCircle, { borderColor: colors.safe }]}>
                    <Text style={styles.avatarEmoji}>👑</Text>
                  </View>
                  <Text style={styles.friendName}>You</Text>
                </View>
                {displayMembers.map((m) => (
                  <View key={m.id} style={styles.friendAvatarWrapper}>
                    <View style={[styles.avatarCircle, { borderColor: getStatusColor(m.status) }]}>
                      <Text style={styles.avatarEmoji}>{m.emoji}</Text>
                    </View>
                    <Text style={styles.friendName} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Circular Radar Visualizer (acting as geofence map) */}
            <View style={styles.radarCard}>
              <View style={styles.radarContainer}>
                <View style={styles.radarOuterCircle}>
                  <View style={styles.radarMiddleCircle} />
                  <View style={styles.radarInnerCircle} />
                  
                  {/* Animated Sweep Line */}
                  <Animated.View style={[styles.radarSweep, { transform: [{ rotate: spin }] }]} />

                  {/* Leader Dot (Center) */}
                  <View style={styles.leaderCenterDot}>
                    <Text style={styles.leaderDotEmoji}>👑</Text>
                  </View>

                  {/* Member Dots mapped dynamically on radar */}
                  {displayMembers.map((m) => {
                    const maxVisualRadius = 90;
                    const percentage = Math.min(m.distance / (radiusMeters * 1.2), 1);
                    const visualDist = percentage * maxVisualRadius;
                    
                    const radAngle = (m.angle * Math.PI) / 180;
                    const xOffset = visualDist * Math.cos(radAngle);
                    const yOffset = visualDist * Math.sin(radAngle);

                    return (
                      <View
                        key={m.id}
                        style={[
                          styles.memberRadarDot,
                          {
                            transform: [{ translateX: xOffset }, { translateY: yOffset }],
                            backgroundColor: getStatusColor(m.status),
                          },
                        ]}
                      >
                        <Text style={styles.memberRadarDotEmoji}>{m.emoji}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Quick Actions Panel */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.meetupActionBtn}
                onPress={() => Alert.alert('Broadcast Meetup', 'Meetup point broadcast to all members.')}
              >
                <Text style={styles.actionBtnIcon}>📌</Text>
                <Text style={styles.actionBtnText}>Send Meetup</Text>
              </TouchableOpacity>

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
        const displayMessages = messages.length > 0
          ? messages.map(msg => ({
              id: msg.id,
              senderName: msg.senderName,
              text: msg.text,
              mine: msg.senderId === 'me',
            }))
          : [
              { id: '1', senderName: 'Sarah Mendis', text: 'Everyone ready to head out?', mine: false },
              { id: '2', senderName: 'You', text: 'Yes! On my way to the meeting point.', mine: true },
              { id: '3', senderName: 'Mike Perera', text: "I'm at the entrance already", mine: false },
            ];

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
              contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
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
                <TouchableOpacity style={styles.inputIconBtn}><Text style={styles.inputIcon}>📍</Text></TouchableOpacity>
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

      case 'alerts':
        const displayAlerts = alerts.length > 0 ? alerts : [
          { id: '1', type: 'out_of_range', memberName: 'Jack Silva', message: 'Jack is 75m away from the group. Last seen 2 minutes ago.', timestamp: Date.now() - 1000 * 60 * 2 },
          { id: '2', type: 'meetup', memberName: 'Sarah Mendis', message: 'Sarah set a meetup point at Central Park Entrance', timestamp: Date.now() - 1000 * 60 * 15 },
          { id: '3', type: 'returned', memberName: 'Mike Perera', message: 'Mike has returned to the group safe range.', timestamp: Date.now() - 1000 * 60 * 30 },
        ];

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

            {displayAlerts.map((alert) => {
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
            })}
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
                <Text style={styles.statGridVal}>12</Text>
                <Text style={styles.statGridLabel}>Trips</Text>
              </View>
              <View style={styles.statGridItem}>
                <Text style={styles.statGridVal}>5</Text>
                <Text style={styles.statGridLabel}>Groups</Text>
              </View>
              <View style={styles.statGridItem}>
                <Text style={styles.statGridVal}>48h</Text>
                <Text style={styles.statGridLabel}>Tracked</Text>
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
                    <Text style={styles.settingItemDesc}>Play alert boundary sirens</Text>
                  </View>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={toggleSound}
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
        return myLocation ? 'Times Square, NYC' : 'Active Connection';
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  leaderCenterDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#0A4A6D',
  },
  leaderDotEmoji: {
    fontSize: 15,
  },
  memberRadarDot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  memberRadarDotEmoji: {
    fontSize: 13,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 8,
  },
  meetupActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0A4A6D',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnText: {
    color: '#0A4A6D',
    fontSize: 15,
    fontWeight: '700',
  },
  sosActionBtn: {
    flex: 1,
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
});
