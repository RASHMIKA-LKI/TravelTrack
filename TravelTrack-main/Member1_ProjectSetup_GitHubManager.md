# 👤 Member 1 — Project Setup & GitHub Manager

> **Your Role:** You are the foundation of the whole team. You set up the GitHub repo, create the React Native project, configure Android, install all packages, and make sure everyone else can start working. You finish first so others can begin.

---

## ✅ Your Task Summary

- Create the GitHub repository
- Initialize the React Native project
- Install all npm packages
- Configure Android permissions
- Create the folder structure
- Create placeholder/empty files so other members can fill them in
- Keep `package.json` and Android config safe (only YOU change these)

---

## 🔧 STEP 1 — Create the GitHub Repository

1. Go to **github.com** → log in → click the **"+"** button → **"New repository"**
2. Name it: `TravelTrack`
3. Set it to **Private** (your team only)
4. Check ✅ **"Add a README file"**
5. Click **"Create repository"**

Now invite your team:
- Go to your repo → **Settings** → **Collaborators** → **Add people**
- Add all 4 other members by their GitHub username

---

## 🔧 STEP 2 — Initialize the React Native Project

Open your terminal (Command Prompt or Terminal) and run these commands **one by one**:

```bash
# Make sure you have Node.js installed first (nodejs.org)
# Make sure you have Android Studio installed with SDK

# Create the project (this takes 3-5 minutes)
npx -y @react-native-community/cli init TravelTrack --pm npm

# Go into the project folder
cd TravelTrack

# Connect it to your GitHub repo (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/TravelTrack.git
git branch -M main
git push -u origin main
```

---

## 🔧 STEP 3 — Install ALL Packages

Copy and paste each block one at a time and wait for each to finish:

```bash
# Navigation (moving between screens)
npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context

# UI components (buttons, cards, etc.)
npm install react-native-paper react-native-vector-icons react-native-reanimated react-native-gesture-handler

# Firebase (login + database)
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore

# Wi-Fi Direct (offline group connection)
npm install react-native-wifi-p2p react-native-tcp-socket

# GPS Location
npm install react-native-geolocation-service

# State management (app memory) + local storage
npm install zustand @react-native-async-storage/async-storage

# Sound and vibration for alerts
npm install react-native-sound react-native-vibration

# Utilities
npm install uuid react-native-device-info
```

---

## 🔧 STEP 4 — Configure Android Permissions

Open this file: `android/app/src/main/AndroidManifest.xml`

Find the line that says `<manifest ...>` and paste ALL of this right after it (before `<application`):

```xml
<!-- Location permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Wi-Fi Direct permissions -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />

<!-- Internet (for Firebase) -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Background running -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Vibration and screen -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Declare Wi-Fi Direct as required hardware -->
<uses-feature android:name="android.hardware.wifi.direct" android:required="true" />
```

Also find the `<application` tag and add `android:usesCleartextTraffic="true"` inside it, like this:
```xml
<application
    android:usesCleartextTraffic="true"
    ...rest of existing stuff...>
```

---

## 🔧 STEP 5 — Create the Full Folder Structure

Run this in your terminal (inside the TravelTrack folder):

```bash
# Create all folders
mkdir -p src/config
mkdir -p src/navigation
mkdir -p src/screens
mkdir -p src/components
mkdir -p src/services
mkdir -p src/store
mkdir -p src/utils
mkdir -p src/types
mkdir -p src/hooks
mkdir -p src/theme
mkdir -p src/assets/sounds
mkdir -p src/assets/images
mkdir -p src/assets/fonts
```

---

## 🔧 STEP 6 — Create Empty Placeholder Files

This is so other members' branches don't conflict. Create each file with just a comment inside:

```bash
# Config
echo "// Firebase config — Member 2 fills this in" > src/config/firebase.ts

# Services
echo "// Auth service — Member 2 fills this in" > src/services/authService.ts
echo "// Firestore service — Member 2 fills this in" > src/services/firestoreService.ts
echo "// Wi-Fi Direct — Member 3 fills this in" > src/services/wifiDirectManager.ts
echo "// TCP Socket — Member 3 fills this in" > src/services/tcpSocketManager.ts
echo "// Location service — Member 3 fills this in" > src/services/locationService.ts
echo "// Alert manager — Member 5 fills this in" > src/services/alertManager.ts

# Stores
echo "// Auth store — Member 2 fills this in" > src/store/useAuthStore.ts
echo "// Tracking store — Member 5 fills this in" > src/store/useTrackingStore.ts
echo "// Settings store — Member 5 fills this in" > src/store/useSettingsStore.ts

# Utils
echo "// Geofence math — Member 3 fills this in" > src/utils/geofence.ts
echo "// Permissions helper — Member 3 fills this in" > src/utils/permissions.ts

# Hooks
echo "// useLocation hook — Member 5 fills this in" > src/hooks/useLocation.ts
echo "// useWifiDirect hook — Member 5 fills this in" > src/hooks/useWifiDirect.ts
echo "// useGeofence hook — Member 5 fills this in" > src/hooks/useGeofence.ts
echo "// useAlerts hook — Member 5 fills this in" > src/hooks/useAlerts.ts
```

---

## 🔧 STEP 7 — Create the Constants & Types Files (YOU fill these in)

Create `src/utils/constants.ts`:
```typescript
// src/utils/constants.ts
export const TCP_PORT = 8888;
export const DEFAULT_RADIUS_METERS = 50;
export const GPS_INTERVAL_MS = 3000;
export const WARNING_RADIUS_METERS = 45; // warn before they exit
export const APP_NAME = 'TravelTrack';
```

Create `src/types/models.ts`:
```typescript
// src/types/models.ts
export interface User {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  status: 'safe' | 'warning' | 'out_of_range' | 'sos';
  lastSeen: number;
}

export interface Group {
  id: string;
  name: string;
  leaderId: string;
  radiusMeters: number;
  createdAt: number;
}

export interface TripRecord {
  id: string;
  groupName: string;
  startTime: number;
  endTime: number;
  memberCount: number;
}
```

Create `src/types/payloads.ts`:
```typescript
// src/types/payloads.ts
export type PayloadType =
  | 'JOIN' | 'WELCOME' | 'LOCATION' | 'GROUP_STATE'
  | 'ALERT' | 'SOS' | 'CHAT' | 'MEETUP_POINT'
  | 'MEMBER_LEFT' | 'KICK';

export interface LocationPayload {
  type: 'LOCATION';
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  bearing: number;
  speed: number;
  batteryLevel: number;
  timestamp: number;
}

export interface SOSPayload {
  type: 'SOS';
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  message: string;
  timestamp: number;
}

export interface ChatPayload {
  type: 'CHAT';
  memberId: string;
  memberName: string;
  message: string;
  timestamp: number;
}
```

---

## 🔧 STEP 8 — Create the Theme File (design colors)

Create `src/theme/colors.ts`:
```typescript
// src/theme/colors.ts
export const colors = {
  primary: '#1A6B5A',        // Main teal color (from app design)
  primaryLight: '#43A090',
  secondary: '#FF6B35',      // Orange accent (from app design)
  danger: '#D32F2F',         // Red for SOS and alerts
  warning: '#FFC107',        // Yellow for near-boundary warning
  safe: '#4CAF50',           // Green for in-range
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textLight: '#666666',
  border: '#E0E0E0',
};
```

Create `src/theme/index.ts`:
```typescript
export { colors } from './colors';
```

---

## 🔧 STEP 9 — Create a Simple App.tsx to Test the Build

Replace the contents of `src/App.tsx` (or root `App.tsx`) with:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TravelTrack</Text>
      <Text style={styles.sub}>Travel Together, Stay Safe</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A6B5A' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 16, color: '#ccc', marginTop: 8 },
});
```

---

## 🔧 STEP 10 — Test the Build

Connect your Android phone with USB, enable Developer Mode & USB Debugging on the phone, then:

```bash
npx react-native run-android
```

If it shows "TravelTrack" on your phone screen — SUCCESS! 🎉

---

## 🔧 STEP 11 — Set Up All Branches for the Team

```bash
# Create all team branches from main
git checkout -b feature/firebase-auth
git push origin feature/firebase-auth

git checkout main
git checkout -b feature/p2p-engine
git push origin feature/p2p-engine

git checkout main
git checkout -b feature/ui-screens
git push origin feature/ui-screens

git checkout main
git checkout -b feature/components-alerts
git push origin feature/components-alerts

# Go back to main
git checkout main
```

Tell each member which branch is theirs. They will clone and switch to their branch.

---

## 🔧 STEP 12 — Push Everything to GitHub

```bash
git add .
git commit -m "feat: initial project setup with all folders and placeholder files"
git push origin main
```

---

## ✅ Your Checklist

- [ ] GitHub repo created and all members invited
- [ ] React Native project initialized
- [ ] All npm packages installed
- [ ] Android permissions added
- [ ] All folders created
- [ ] All placeholder files created
- [ ] `constants.ts`, `models.ts`, `payloads.ts` filled in
- [ ] `colors.ts` and theme created
- [ ] App runs on Android phone (`npx react-native run-android`)
- [ ] All 4 feature branches created and pushed
- [ ] Share repo link with team

---

## 📌 Files You Own (never let others edit these)

- `package.json` and `package-lock.json`
- `android/app/src/main/AndroidManifest.xml`
- `android/build.gradle` and `android/app/build.gradle`
- `src/types/models.ts`, `src/types/payloads.ts`, `src/types/navigation.ts`
- `src/utils/constants.ts`
- `src/theme/colors.ts`
- `index.js`, `babel.config.js`, `metro.config.js`, `tsconfig.json`
