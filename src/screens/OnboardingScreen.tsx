// src/screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: '✈️',
    title: 'Communicate',
    desc: 'Chat with friends, collaborate with them and stay connected anytime, anywhere.',
    gradient: ['#7B2CBF', '#FF6B35'],
  },
  {
    icon: '🛡️',
    title: 'Stay Safe',
    desc: 'Emergency SOS alerts, nearby hospital locations, and instant notifications for your peace of mind.',
    gradient: ['#E74C3C', '#FF6B35'],
  },
  {
    icon: '👥',
    title: 'Group Coordination',
    desc: 'Send meetup points, coordinate plans, and stay connected with your travel companions.',
    gradient: ['#2ECC71', '#FF6B35'],
  },
  {
    icon: '📍',
    title: 'Track Your Journey',
    desc: 'Share your real-time location with friends and family. Never lose track of your group during travels.',
    gradient: ['#0A4A6D', '#10B981'],
  },
] as const;

export function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);

  /** Mark onboarding as done so it never shows again, then go to Login */
  const finishOnboarding = async () => {
    await AsyncStorage.setItem('@TravelTrack:hasSeenOnboarding', 'true');
    navigation.replace('Login');
  };

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View />
        <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slide Content */}
      <View style={styles.contentContainer}>
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={slide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBgPulse}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{slide.icon}</Text>
            </View>
          </LinearGradient>
        </View>
        
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      {/* Indicators */}
      <View style={styles.indicatorContainer}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.indicator,
              i === currentIndex ? styles.activeIndicator : null,
            ]}
          />
        ))}
      </View>

      {/* Footer controls */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.skipBtnBottom} 
          onPress={finishOnboarding}
        >
          <Text style={styles.skipBtnTextBottom}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.nextBtnBottom} onPress={goNext}>
          <Text style={styles.nextBtnTextBottom}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    height: 60,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 15,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    flex: 1,
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgPulse: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconText: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: '#0A4A6D',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  skipBtnBottom: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  skipBtnTextBottom: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
  },
  nextBtnBottom: {
    flex: 1.2,
    backgroundColor: '#0A4A6D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0A4A6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  nextBtnTextBottom: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
