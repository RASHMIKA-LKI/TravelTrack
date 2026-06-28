// src/screens/SOSScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { alertManager } from '../services/alertManager';

export function SOSScreen({ navigation }: any) {
  const triggerSOS = useTrackingStore((state) => state.triggerSOS);
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.25,
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

  const handleSOS = () => {
    Alert.alert(
      '🆘 SOS Sent!',
      'Your location has been shared with all group members. Help is on the way.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );

    // Call store triggers
    if (triggerSOS) {
      triggerSOS('You');
    }

    // Call alert manager triggers for audio/vibration loops
    if (alertManager && alertManager.triggerSOSAlert) {
      alertManager.triggerSOSAlert('You', 0, 0);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Emergency Center</Text>
          <Text style={styles.subtitle}>
            In danger? Press the SOS button below to alert your tracking circle immediately.
          </Text>

          {/* SOS Pulsing Button */}
          <View style={styles.sosContainer}>
            <Animated.View style={[styles.sosGlow, { transform: [{ scale: glowAnim }] }]} />
            <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.85}>
              <Text style={styles.sosEmoji}>🆘</Text>
              <Text style={styles.sosBtnText}>SEND SOS</Text>
              <Text style={styles.sosDescText}>SHARE GPS TO GROUP</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.servicesTitle}>Local Emergency Services (Sri Lanka)</Text>
          
          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceLabel}>🚨 National Emergency Center</Text>
              <Text style={styles.serviceDesc}>Police emergency hotline assistance</Text>
            </View>
            <Text style={styles.serviceNumber}>119</Text>
          </View>

          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceLabel}>🚓 Sri Lanka Police</Text>
              <Text style={styles.serviceDesc}>Direct police headquarters dispatch</Text>
            </View>
            <Text style={styles.serviceNumber}>119</Text>
          </View>

          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceLabel}>🚑 Suwaseriya Ambulance</Text>
              <Text style={styles.serviceDesc}>Free pre-hospital emergency service</Text>
            </View>
            <Text style={styles.serviceNumber}>1990</Text>
          </View>

          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceLabel}>🚒 Fire Department</Text>
              <Text style={styles.serviceDesc}>Fire control and rescue service</Text>
            </View>
            <Text style={styles.serviceNumber}>110</Text>
          </View>
        </ScrollView>
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
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 32,
  },
  sosContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  sosGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(211, 47, 47, 0.12)',
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  sosEmoji: {
    fontSize: 36,
  },
  sosBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
    marginTop: 4,
  },
  sosDescText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  servicesTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 10,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  serviceDesc: {
    fontSize: 11,
    color: '#888888',
    marginTop: 3,
  },
  serviceNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    backgroundColor: '#E8F5F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
