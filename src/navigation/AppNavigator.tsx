// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthStore } from '../store/useAuthStore';

export function AppNavigator() {
  const { isLoggedIn, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    if (initialize) {
      initialize();
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A6B5A' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
