// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { useTrackingStore } from '../store/useTrackingStore';
import { getOrCreatePeerId } from '../services/identityService';
import { initializeSessionPersistence } from '../services/sessionPersistenceService';

export function AppNavigator() {
  const { isLoggedIn, isLoading, loadingAction, initialize } = useAuthStore();
  const setIdentity = useTrackingStore((state) => state.setIdentity);
  const identityReady = useTrackingStore((state) => state.identityReady);
  const persistenceReady = useTrackingStore((state) => state.persistenceReady);

  useEffect(() => {
    if (initialize) {
      initialize();
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getOrCreatePeerId()
      .then((deviceId) => { if (active) setIdentity(deviceId); })
      .catch((error) => console.warn('Could not restore local peer identity:', error));

    return () => { active = false; };
  }, [setIdentity]);

  useEffect(() => {
    void initializeSessionPersistence();
  }, []);

  // ─── Spinner logic ────────────────────────────────────────────────────────
  // isLoading is set to true for ALL auth actions (register, login, logout…).
  // We must NOT unmount the navigator during those — that destroys local state
  // in LoginScreen (e.g. isSignUp flag) and resets the form to Login mode.
  //
  // The ONLY safe time to block the entire UI with a spinner is during
  // 'initialize', which is the one-time cold-start session restore. After that,
  // each screen handles its own loading indicator on its own button.
  const showInitSpinner = (isLoading && loadingAction === 'initialize') || !identityReady || !persistenceReady;

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
