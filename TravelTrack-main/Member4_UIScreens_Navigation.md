# 👤 Member 4 — UI Screens & Navigation

> **Your Role:** You are responsible for everything the user sees and taps. All the screens, the navigation between them, and the visual theme. You work with dummy/mock data first, then connect to the real services once other members finish their parts.

---

## ✅ Your Task Summary

- Set up React Navigation (the system that moves between screens)
- Build ALL 13 screens of the app
- Style them to match the TravelTrack design (teal + orange colors)
- You do NOT write Firebase or Wi-Fi logic — you only call functions from Member 2 and Member 5's stores/hooks
- Use placeholder/mock data where real data isn't ready yet

---

## 🔧 STEP 1 — Get Set Up on GitHub

```bash
git clone https://github.com/YOUR_TEAM/TravelTrack.git
cd TravelTrack
npm install
git checkout feature/ui-screens
```

---

## 🔧 STEP 2 — Set Up Navigation

Navigation = the system that controls which screen you're on, and how to move between screens.

Create `src/navigation/AppNavigator.tsx`:

```tsx
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

// Temporary: set isLoggedIn to false to see login screens, true to see main app
// Later, Member 2's useAuthStore will control this
const isLoggedIn = false;

export function AppNavigator() {
  return (
    <NavigationContainer>
      {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

Create `src/navigation/AuthNavigator.tsx` (screens before login):

```tsx
// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
```

Create `src/navigation/MainNavigator.tsx` (screens after login):

```tsx
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
```

---

## 🔧 STEP 3 — Update App.tsx to Use Your Navigator

Open `App.tsx` (root file) and replace it with:

```tsx
import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
```

---

## 🔧 STEP 4 — Build Each Screen

Build these screens one by one. Each is a separate file.

### Screen 1: Splash Screen
```tsx
// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function SplashScreen({ navigation }: any) {
  useEffect(() => {
    // After 2 seconds, go to onboarding
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Mountain icon placeholder */}
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>⛰️</Text>
      </View>
      <Text style={styles.title}>TravelTrack</Text>
      <Text style={styles.subtitle}>Travel Together, Stay Safe</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A6B5A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 50 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
});
```

### Screen 2: Onboarding Screen
```tsx
// src/screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: '📍',
    title: 'Track Your Journey',
    desc: 'Share your real-time location with friends and family. Never lose track of your group.',
  },
  {
    icon: '🛡️',
    title: 'Stay Safe',
    desc: 'Emergency SOS alerts and instant notifications for your peace of mind.',
  },
  {
    icon: '💬',
    title: 'Communicate',
    desc: 'Chat with friends, coordinate plans, and stay connected anytime, anywhere.',
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

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={() => navigation.replace('Login')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{slide.icon}</Text>
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.desc}>{slide.desc}</Text>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={goNext}>
        <Text style={styles.buttonText}>
          {currentIndex < slides.length - 1 ? 'Next' : 'Get Started'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 60 },
  skip: { alignSelf: 'flex-end', padding: 16 },
  skipText: { color: '#1A6B5A', fontWeight: '600' },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E8F5F2', justifyContent: 'center', alignItems: 'center',
    marginTop: 40, marginBottom: 32,
  },
  icon: { fontSize: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  desc: { fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 32, lineHeight: 24 },
  dots: { flexDirection: 'row', marginTop: 40, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D0D0' },
  activeDot: { backgroundColor: '#1A6B5A', width: 20 },
  button: {
    marginTop: 40, backgroundColor: '#1A6B5A',
    paddingVertical: 16, paddingHorizontal: 60, borderRadius: 30,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

### Screen 3: Login Screen
```tsx
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = () => {
    // TODO: Connect to Member 2's useAuthStore
    // const { login, register } = useAuthStore();
    // if (isSignUp) register(email, password, name);
    // else login(email, password);
    
    // Temporary: just navigate to home
    navigation.replace('Home');
  };

  const handleGuest = () => {
    // TODO: useAuthStore.loginAsGuest()
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TravelTrack</Text>
      <Text style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.outlineButton} onPress={handleGuest}>
        <Text style={styles.outlineText}>Continue as Guest</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20 }}>
        <Text style={styles.toggleText}>
          {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 32 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1A6B5A', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 12, backgroundColor: '#F9F9F9',
  },
  button: {
    backgroundColor: '#1A6B5A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineButton: {
    borderWidth: 2, borderColor: '#1A6B5A', padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 12,
  },
  outlineText: { color: '#1A6B5A', fontSize: 16, fontWeight: '600' },
  toggleText: { color: '#1A6B5A', textAlign: 'center', fontSize: 14 },
});
```

### Screen 4: Home Screen
```tsx
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.header}>TravelTrack</Text>
        <Text style={styles.greeting}>Hello, Traveler! 👋</Text>
        <Text style={styles.sub}>What would you like to do?</Text>

        {/* Create Group Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#1A6B5A' }]}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.cardIcon}>👑</Text>
          <Text style={styles.cardTitle}>Create Group</Text>
          <Text style={styles.cardDesc}>Start a trip and let others join you</Text>
        </TouchableOpacity>

        {/* Join Group Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#FF6B35' }]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.cardIcon}>🔍</Text>
          <Text style={styles.cardTitle}>Join Group</Text>
          <Text style={styles.cardDesc}>Find and join a nearby group leader</Text>
        </TouchableOpacity>

        {/* Quick links */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallCard} onPress={() => navigation.navigate('TripHistory')}>
            <Text style={styles.smallIcon}>📋</Text>
            <Text style={styles.smallLabel}>Trip History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallCard} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.smallIcon}>⚙️</Text>
            <Text style={styles.smallLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, padding: 24 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1A6B5A', marginBottom: 4 },
  greeting: { fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginTop: 16 },
  sub: { fontSize: 14, color: '#666', marginBottom: 24 },
  card: {
    borderRadius: 20, padding: 24, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  cardIcon: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', gap: 12 },
  smallCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center', elevation: 2,
  },
  smallIcon: { fontSize: 28, marginBottom: 8 },
  smallLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
});
```

### Screen 5: Create Group Screen
```tsx
// src/screens/CreateGroupScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [radius, setRadius] = useState(50);

  const handleStart = () => {
    if (!groupName.trim()) return alert('Please enter a group name');
    // TODO: Call Member 3's wifiDirectManager.startHosting()
    // TODO: Call Member 3's tcpSocketManager.startServer()
    navigation.navigate('GroupLobby', { groupName, isLeader: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Group</Text>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Trek Team 2025"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Text style={styles.label}>Safe Radius: {radius}m</Text>
        <Text style={styles.desc}>Members will be alerted if they go beyond {radius} meters from you</Text>
        <View style={styles.radiusRow}>
          {[25, 50, 75, 100].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusBtn, radius === r && styles.activeBtnStyle]}
              onPress={() => setRadius(r)}
            >
              <Text style={[styles.radiusBtnText, radius === r && { color: '#fff' }]}>{r}m</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startText}>🚀 Start Hosting</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24 },
  back: { marginBottom: 16 },
  backText: { color: '#1A6B5A', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  desc: { fontSize: 13, color: '#888', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 24,
  },
  radiusRow: { flexDirection: 'row', gap: 10, marginBottom: 40 },
  radiusBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 2, borderColor: '#1A6B5A', alignItems: 'center',
  },
  activeBtnStyle: { backgroundColor: '#1A6B5A' },
  radiusBtnText: { color: '#1A6B5A', fontWeight: '700' },
  startButton: {
    backgroundColor: '#1A6B5A', padding: 18, borderRadius: 16, alignItems: 'center',
  },
  startText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
```

### Screen 6: Scan Screen (Member joins group)
```tsx
// src/screens/ScanScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';

export function ScanScreen({ navigation }: any) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const startScan = () => {
    setScanning(true);
    setDevices([]);
    // TODO: Call Member 3's wifiDirectManager.startScanning()
    // For now, show mock data after 2 seconds
    setTimeout(() => {
      setDevices([
        { deviceAddress: '00:11:22', deviceName: "Alex's Phone (Trek Team)" },
        { deviceAddress: '00:11:23', deviceName: "Sarah's Group (Hiking 2025)" },
      ]);
      setScanning(false);
    }, 2000);
  };

  const connectTo = (device: any) => {
    // TODO: Call wifiDirectManager.connectToLeader(device.deviceAddress)
    navigation.navigate('GroupLobby', { isLeader: false, groupName: device.deviceName });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Find a Group</Text>
        <Text style={styles.sub}>Scan for nearby group leaders</Text>

        <TouchableOpacity style={styles.scanBtn} onPress={startScan} disabled={scanning}>
          <Text style={styles.scanBtnText}>{scanning ? '🔄 Scanning...' : '🔍 Start Scan'}</Text>
        </TouchableOpacity>

        {devices.length > 0 && (
          <>
            <Text style={styles.found}>Found {devices.length} group(s):</Text>
            <FlatList
              data={devices}
              keyExtractor={item => item.deviceAddress}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.deviceCard} onPress={() => connectTo(item)}>
                  <Text style={styles.deviceName}>{item.deviceName}</Text>
                  <Text style={styles.connectText}>Tap to connect →</Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24 },
  back: { marginBottom: 16 },
  backText: { color: '#1A6B5A', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  sub: { fontSize: 14, color: '#888', marginBottom: 24 },
  scanBtn: {
    backgroundColor: '#1A6B5A', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 24,
  },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  found: { fontSize: 14, color: '#888', marginBottom: 12 },
  deviceCard: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, marginBottom: 10,
  },
  deviceName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  connectText: { fontSize: 13, color: '#1A6B5A', marginTop: 4 },
});
```

### Screen 7: Group Lobby Screen
```tsx
// src/screens/GroupLobbyScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';

const mockMembers = [
  { id: '1', name: 'You (Leader)', emoji: '👑' },
  { id: '2', name: 'Sarah', emoji: '👩' },
  { id: '3', name: 'Mike', emoji: '👨' },
];

export function GroupLobbyScreen({ navigation, route }: any) {
  const { groupName, isLeader } = route.params || {};
  const [members] = useState(mockMembers);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{groupName || 'Group Lobby'}</Text>
        <Text style={styles.sub}>{members.length} member(s) connected</Text>

        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.ready}>✅ Ready</Text>
            </View>
          )}
          style={styles.list}
        />

        {isLeader && (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => navigation.navigate('Tracking')}
          >
            <Text style={styles.startBtnText}>🟢 Start Tracking</Text>
          </TouchableOpacity>
        )}
        {!isLeader && (
          <View style={styles.waitBox}>
            <Text style={styles.waitText}>⏳ Waiting for leader to start...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 24 },
  list: { flex: 1 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 12, backgroundColor: '#F5F5F5', marginBottom: 8,
  },
  emoji: { fontSize: 28, marginRight: 12 },
  memberName: { flex: 1, fontSize: 16, fontWeight: '600' },
  ready: { color: '#4CAF50', fontWeight: '600' },
  startBtn: {
    backgroundColor: '#1A6B5A', padding: 18, borderRadius: 16, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  waitBox: {
    backgroundColor: '#F5F5F5', padding: 18, borderRadius: 16, alignItems: 'center',
  },
  waitText: { color: '#666', fontSize: 16 },
});
```

### Screen 8: Tracking Screen (Main screen — radar view)
```tsx
// src/screens/TrackingScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const mockData = [
  { id: '1', name: 'Sarah', distance: 12, status: 'safe', emoji: '👩' },
  { id: '2', name: 'Mike', distance: 38, status: 'warning', emoji: '👨' },
  { id: '3', name: 'Jack', distance: 67, status: 'out_of_range', emoji: '🧑' },
];

const statusColor: any = { safe: '#4CAF50', warning: '#FFC107', out_of_range: '#D32F2F' };

export function TrackingScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>TravelTrack</Text>
        <Text style={styles.location}>📍 Times Square, NYC</Text>
      </View>

      {/* Simple radar placeholder — Member 5 will add the RadarView component */}
      <View style={styles.radarPlaceholder}>
        <View style={styles.radarOuter}>
          <View style={styles.radarInner} />
          <Text style={styles.youDot}>📍 You</Text>
        </View>
      </View>

      {/* Member list */}
      <ScrollView style={styles.memberList}>
        {mockData.map(m => (
          <View key={m.id} style={styles.memberCard}>
            <Text style={styles.memberEmoji}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberDist}>{m.distance}m away</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColor[m.status] }]} />
          </View>
        ))}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.meetupBtn}>
          <Text style={styles.meetupText}>📌 Send Meetup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => navigation.navigate('SOS')}
        >
          <Text style={styles.sosText}>🆘 SOS Alert</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A6B5A' },
  location: { fontSize: 13, color: '#888', marginTop: 2 },
  radarPlaceholder: { alignItems: 'center', padding: 24 },
  radarOuter: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(26, 107, 90, 0.1)',
    borderWidth: 2, borderColor: 'rgba(26, 107, 90, 0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  radarInner: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(26, 107, 90, 0.15)',
    borderWidth: 1, borderColor: 'rgba(26, 107, 90, 0.3)',
    position: 'absolute',
  },
  youDot: { fontSize: 16, fontWeight: 'bold', color: '#1A6B5A' },
  memberList: { flex: 1, paddingHorizontal: 16 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  memberEmoji: { fontSize: 28, marginRight: 12 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberDist: { fontSize: 13, color: '#888' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  bottomRow: { flexDirection: 'row', padding: 16, gap: 12 },
  meetupBtn: {
    flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 14,
    alignItems: 'center', borderWidth: 2, borderColor: '#1A6B5A',
  },
  meetupText: { color: '#1A6B5A', fontWeight: '700' },
  sosBtn: {
    flex: 1, backgroundColor: '#D32F2F', padding: 16, borderRadius: 14, alignItems: 'center',
  },
  sosText: { color: '#fff', fontWeight: '700' },
});
```

### Screen 9: SOS Screen
```tsx
// src/screens/SOSScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';

export function SOSScreen({ navigation }: any) {
  const handleSOS = () => {
    Alert.alert(
      '🆘 SOS Sent!',
      'Your location has been shared with all group members. Help is on the way.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
    // TODO: Call Member 5's alertManager.triggerSOSAlert()
    // TODO: Send SOS via Member 3's tcpSocketManager.send()
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
        <Text style={styles.closeText}>✕ Close</Text>
      </TouchableOpacity>
      <View style={styles.container}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.sub}>Quick access to help</Text>

        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <Text style={styles.sosLabel}>🆘</Text>
          <Text style={styles.sosText}>Send SOS to Group</Text>
          <Text style={styles.sosDesc}>Instantly notify all group members with your current location</Text>
        </TouchableOpacity>

        <Text style={styles.servicesTitle}>Emergency Services</Text>
        {[
          { label: '🚨 Emergency Services', number: '119' },
          { label: '🚓 Police', number: '119' },
          { label: '🚑 Ambulance', number: '110' },
          { label: '🚒 Fire Department', number: '111' },
        ].map((service, i) => (
          <View key={i} style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>{service.label}</Text>
            <Text style={styles.serviceNumber}>{service.number}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  close: { alignSelf: 'flex-end', padding: 16 },
  closeText: { color: '#888', fontSize: 16 },
  container: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 24 },
  sosButton: {
    backgroundColor: '#D32F2F', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 32,
  },
  sosLabel: { fontSize: 48, marginBottom: 8 },
  sosText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  sosDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  servicesTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 8,
  },
  serviceLabel: { fontSize: 15 },
  serviceNumber: { fontSize: 15, fontWeight: '700', color: '#1A6B5A' },
});
```

### Remaining Screens (Chat, Settings, TripHistory) — Simpler Versions
```tsx
// src/screens/ChatScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native';

const mockMessages = [
  { id: '1', sender: 'Sarah', text: 'Everyone ready to head out?', time: '23:38', mine: false },
  { id: '2', sender: 'You', text: 'Yes! On my way to the meeting point', time: '23:40', mine: true },
  { id: '3', sender: 'Mike', text: "I'm at the entrance already", time: '23:42', mine: false },
];

export function ChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), sender: 'You', text: input, time: 'now', mine: true }]);
    setInput('');
    // TODO: Send via tcpSocketManager.send({ type: 'CHAT', message: input })
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={i => i.id}
        style={{ flex: 1, padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
            {!item.mine && <Text style={styles.senderName}>{item.sender}</Text>}
            <Text style={styles.msgText}>{item.text}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Type a message..." />
        <TouchableOpacity style={styles.sendBtn} onPress={send}><Text style={styles.sendText}>Send</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  back: { color: '#1A6B5A', marginRight: 12, fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  mine: { backgroundColor: '#1A6B5A', alignSelf: 'flex-end' },
  theirs: { backgroundColor: '#F0F0F0', alignSelf: 'flex-start' },
  senderName: { fontSize: 12, color: '#888', marginBottom: 4 },
  msgText: { color: '#fff', fontSize: 15 },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 24, paddingHorizontal: 16, fontSize: 15 },
  sendBtn: { backgroundColor: '#1A6B5A', paddingHorizontal: 20, borderRadius: 24, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
```

---

## 🔧 STEP 5 — Save and Push Your Work

```bash
git add .
git commit -m "feat: add all screens and navigation setup"
git push origin feature/ui-screens
```

---

## ✅ Your Checklist

- [ ] `AppNavigator.tsx`, `AuthNavigator.tsx`, `MainNavigator.tsx` done
- [ ] `SplashScreen.tsx` ✅
- [ ] `OnboardingScreen.tsx` ✅
- [ ] `LoginScreen.tsx` ✅
- [ ] `HomeScreen.tsx` ✅
- [ ] `CreateGroupScreen.tsx` ✅
- [ ] `ScanScreen.tsx` ✅
- [ ] `GroupLobbyScreen.tsx` ✅
- [ ] `TrackingScreen.tsx` ✅
- [ ] `SOSScreen.tsx` ✅
- [ ] `ChatScreen.tsx` ✅
- [ ] `SettingsScreen.tsx` (simple version)
- [ ] `TripHistoryScreen.tsx` (simple version)
- [ ] All screens navigate correctly
- [ ] Pushed to `feature/ui-screens`

---

## 📌 Files You Own

- Everything inside `src/screens/`
- Everything inside `src/navigation/`
- Everything inside `src/theme/`
- Everything inside `src/assets/`
