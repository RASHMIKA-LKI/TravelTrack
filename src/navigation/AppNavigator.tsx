// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { useTrackingStore } from '../store/useTrackingStore';

export function AppNavigator() {
  const { isLoggedIn, isLoading, loadingAction, initialize } = useAuthStore();
  const setMyDeviceId = useTrackingStore((state) => state.setMyDeviceId);

  useEffect(() => {
    if (initialize) {
      initialize();
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Keep a private, installation-scoped peer identifier stable across app
    // restarts. It is intentionally unrelated to the Firebase UID, so joining
    // a nearby group does not disclose the user's cloud-account identifier.
    void (async () => {
      const key = '@TravelTrack:peer-id';
      let deviceId = await AsyncStorage.getItem(key);
      if (!deviceId) {
        deviceId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        await AsyncStorage.setItem(key, deviceId);
      }
      if (active) setMyDeviceId(deviceId);
    })().catch((error) => console.warn('Could not restore local peer identity:', error));

    return () => { active = false; };
  }, [setMyDeviceId]);

  // ─── Spinner logic ────────────────────────────────────────────────────────
  // isLoading is set to true for ALL auth actions (register, login, logout…).
  // We must NOT unmount the navigator during those — that destroys local state
  // in LoginScreen (e.g. isSignUp flag) and resets the form to Login mode.
  //
  // The ONLY safe time to block the entire UI with a spinner is during
  // 'initialize', which is the one-time cold-start session restore. After that,
  // each screen handles its own loading indicator on its own button.
  const showInitSpinner = isLoading && loadingAction === 'initialize';

  return (
    <NavigationContainer>
      {showInitSpinner ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A4A6D' }}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : isLoggedIn ? (
        <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
