// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

export function SplashScreen({ navigation }: any) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Elegant fade-in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      })
    ]).start();

    const timer = setTimeout(async () => {
      // Skip Onboarding if user has already seen it before
      const hasSeen = await AsyncStorage.getItem('@TravelTrack:hasSeenOnboarding');
      if (hasSeen === 'true') {
        navigation.replace('Login');
      } else {
        navigation.replace('Onboarding');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0A4A6D', '#FF6B35']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <View style={styles.mountainContainer}>
              <View style={styles.mountainPeak} />
              <View style={styles.mountainBase}>
                <View style={styles.baseLine} />
                <View style={styles.baseLine} />
                <View style={styles.baseLine} />
              </View>
            </View>
          </View>
          <View style={styles.orangeDot} />
        </View>
        <Text style={styles.title}>TravelTrack</Text>
        <Text style={styles.subtitle}>Travel Together, Stay Safe</Text>
      </Animated.View>

      <Animated.View style={[styles.footerContainer, { opacity: fadeAnim }]}>
        <View style={styles.indicatorContainer}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  orangeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  mountainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  mountainPeak: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0A4A6D', // brand color
  },
  mountainBase: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  baseLine: {
    width: 4,
    height: 8,
    backgroundColor: '#0A4A6D',
    borderRadius: 2,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    backgroundColor: '#ffffff',
    width: 20,
  },
});
