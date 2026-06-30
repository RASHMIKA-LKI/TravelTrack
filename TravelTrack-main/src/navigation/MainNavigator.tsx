// src/navigation/MainNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CreateGroupScreen } from '../screens/CreateGroupScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { GroupLobbyScreen } from '../screens/GroupLobbyScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { SOSScreen } from '../screens/SOSScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TripHistoryScreen } from '../screens/TripHistoryScreen';

const Stack = createNativeStackNavigator();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="GroupLobby" component={GroupLobbyScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
    </Stack.Navigator>
  );
}
