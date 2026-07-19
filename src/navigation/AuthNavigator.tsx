// src/navigation/AuthNavigator.tsx
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  const { skipToLogin, setSkipToLogin } = useAuthStore();

  useEffect(() => {
    // Reset the flag after we have applied it so next normal launch starts fresh
    if (skipToLogin) setSkipToLogin(false);
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={skipToLogin ? 'Login' : 'Splash'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
