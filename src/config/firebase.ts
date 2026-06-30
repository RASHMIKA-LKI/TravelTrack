// src/config/firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS (one-time):
//   1. Go to console.firebase.google.com → Your TravelTrack project
//   2. Click ⚙️ Project Settings → Your apps → Web app (</>)
//   3. Copy your firebaseConfig values and paste them below, replacing
//      each 'YOUR_...' placeholder with the actual value.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── YOUR FIREBASE CONFIG ────────────────────────────────────────────────────
// Paste your config object from Firebase Console here:
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Custom AsyncStorage Persistence ─────────────────────────────────────────
// Firebase v12 for React Native requires a custom persistence adapter using
// AsyncStorage so the user session is saved to disk and restored on app restart.
// const reactNativePersistence = {
//   type: 'LOCAL' as const,

//   async _isAvailable(): Promise<boolean> {
//     try {
//       const key = '__firebase_test__';
//       await AsyncStorage.setItem(key, '1');
//       await AsyncStorage.removeItem(key);
//       return true;
//     } catch {
//       return false;
//     }
//   },

//   async _set(key: string, value: string): Promise<void> {
//     await AsyncStorage.setItem(key, value);
//   },

//   async _get(key: string): Promise<string | null> {
//     return AsyncStorage.getItem(key);
//   },

//   async _remove(key: string): Promise<void> {
//     await AsyncStorage.removeItem(key);
//   },

//   _addListener(_key: string, _listener: unknown): void {
//     // Not needed for AsyncStorage
//   },

//   _removeListener(_key: string, _listener: unknown): void {
//     // Not needed for AsyncStorage
//   },
// };

// ─── Initialize Firebase App ──────────────────────────────────────────────────
// Guard against duplicate initialization during Expo hot-reload in development
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Initialize Firebase Auth ─────────────────────────────────────────────────
// Uses our custom AsyncStorage persistence so the user stays logged in
// across full app restarts (no need to sign in every time they open the app).
// let auth: ReturnType<typeof getAuth>;
// try {
//   auth = initializeAuth(app, {
//     persistence: reactNativePersistence as any,
//   });
// } catch {
//   // initializeAuth throws if called a second time (e.g. on Fast Refresh in dev)
//   auth = getAuth(app);
// }
let auth: ReturnType<typeof getAuth>;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Fast Refresh / Hot Reload
  auth = getAuth(app);
}

// ─── Initialize Firestore ─────────────────────────────────────────────────────
const db = getFirestore(app);

// Re-enable network connectivity on startup
enableNetwork(db).catch(() => {
  // Silently ignore — this just means Firestore was already connected
});

export { auth, db };
