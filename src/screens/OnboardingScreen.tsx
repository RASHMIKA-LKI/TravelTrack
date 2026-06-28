// src/screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: '📍',
    title: 'Track Your Journey',
    desc: 'Share your real-time location with friends and family. Never lose track of your group even in remote areas.',
  },
  {
    icon: '🛡️',
    title: 'Stay Safe',
    desc: 'Instant emergency SOS alerts, proximity boundaries, and automatic warning notifications for your peace of mind.',
  },
  {
    icon: '💬',
    title: 'Offline Communication',
    desc: 'Chat with friends and coordinate plans using local peer-to-peer Wi-Fi connections, completely offline.',
  },
];

export function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Header */}
      <View style={styles.header}>
        {currentIndex > 0 ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slide Content */}
      <View style={styles.contentContainer}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconBgPulse}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{slide.icon}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      {/* Footer controls */}
      <View style={styles.footer}>
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

        {/* Primary Action Button */}
        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex === slides.length - 1 ? 'Get Started 🚀' : 'Next →'}
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    height: 60,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: colors.primary,
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
    backgroundColor: '#E8F5F2',
    justify('center'),
    alignItems: 'center',
  },
  iconBgPulse: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#E8F5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  iconText: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: width - 48,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
