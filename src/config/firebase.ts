// src/config/firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS (one-time):
//   1. Go to console.firebase.google.com → Your TravelTrack project
//   2. Click ⚙️ Project Settings → Your apps → Web app (</>)
//   3. Copy your firebaseConfig values and paste them below, replacing
//      each 'YOUR_...' placeholder with the actual value.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore — getReactNativePersistence is not in the TS typings for firebase/auth
// but is available at runtime in React Native environments (Firebase v12+)
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── YOUR FIREBASE CONFIG ────────────────────────────────────────────────────
// These values come from environment variables defined in .env
// See .env.example for the required keys.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ─── Validate required config ────────────────────────────────────────────────
// Fail fast with a clear message if .env is missing or incomplete,
// instead of crashing later with a confusing Firebase error.
const requiredKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.error(
      `❌ Missing Firebase config: "${key}" is undefined.\n` +
      `   Copy .env.example to .env and fill in your Firebase credentials.\n` +
      `   Get them from: Firebase Console → Project Settings → Your apps → Web app`
    );
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Initialize Firebase App ──────────────────────────────────────────────────
// Guard against duplicate initialization during Expo hot-reload in development
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Initialize Firebase Auth ─────────────────────────────────────────────────
// Uses getReactNativePersistence with AsyncStorage so the user stays logged in
// across full app restarts (no need to sign in every time they open the app).
let auth: ReturnType<typeof getAuth>;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // initializeAuth throws if called a second time (e.g. on Fast Refresh in dev)
  auth = getAuth(app);
}

// ─── Initialize Firestore ─────────────────────────────────────────────────────
const db = getFirestore(app);

// Re-enable network connectivity on startup
enableNetwork(db).catch(() => {
  // Silently ignore — this just means Firestore was already connected
});

export { auth, db };
