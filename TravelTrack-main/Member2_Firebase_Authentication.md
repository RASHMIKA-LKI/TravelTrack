# 👤 Member 2 — Firebase & Authentication

> **Your Role:** You handle everything related to user accounts (login, sign up, profile) and the online database (Firebase). You work on your own branch and your files never overlap with the others.

---

## ✅ Your Task Summary

- Set up Firebase project on the web
- Write the login/signup logic
- Write the database (Firestore) logic for saving user profiles and trip history
- Write the Zustand auth store (global login state)
- You do NOT touch any screens — Member 4 handles screens
- You provide functions that Member 4's screens will call

---

## 🔧 STEP 1 — Get Set Up on GitHub

```bash
# Clone the repo (after Member 1 shares the link)
git clone https://github.com/YOUR_TEAM/TravelTrack.git
cd TravelTrack

# Install packages
npm install

# Switch to YOUR branch
git checkout feature/firebase-auth
```

---

## 🔧 STEP 2 — Create the Firebase Project

1. Go to **console.firebase.google.com**
2. Click **"Add project"** → name it `TravelTrack` → click through
3. On the left menu → **Authentication** → **Get started**
4. Click **"Email/Password"** → enable it → Save
5. On the left menu → **Firestore Database** → **Create database**
   - Choose **"Start in test mode"** (for development)
   - Pick any location → Done
6. On the left menu → click the **gear icon** ⚙️ → **Project settings**
7. Scroll down to **"Your apps"** → click the Android icon 🤖
8. Register app with package name: `com.traveltrack`
9. Download the `google-services.json` file
10. Put `google-services.json` inside: `android/app/google-services.json`

---

## 🔧 STEP 3 — Configure Firebase in Android Build Files

Open `android/build.gradle` (the TOP-LEVEL one, NOT inside /app/) and add this inside `dependencies {}`:
```gradle
classpath 'com.google.gms:google-services:4.4.0'
```

Open `android/app/build.gradle` and add this at the very BOTTOM of the file:
```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## 🔧 STEP 4 — Write the Firebase Config File

Open `src/config/firebase.ts` (Member 1 already created this as a placeholder) and replace it with:

```typescript
// src/config/firebase.ts
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Enable Firestore offline persistence (works without internet!)
firestore().settings({
  persistence: true,  // This makes it work offline!
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

export { auth, firestore };
```

---

## 🔧 STEP 5 — Write the Auth Service

Open `src/services/authService.ts` and replace the placeholder comment with:

```typescript
// src/services/authService.ts
import auth from '@react-native-firebase/auth';

export const authService = {

  /** Create a new account with email and password */
  signUp: async (email: string, password: string, displayName: string) => {
    const result = await auth().createUserWithEmailAndPassword(email, password);
    // Save their display name
    await result.user.updateProfile({ displayName });
    return result.user;
  },

  /** Log in with email and password */
  signIn: async (email: string, password: string) => {
    const result = await auth().signInWithEmailAndPassword(email, password);
    return result.user;
  },

  /** Log in without an account (guest mode) */
  signInAnonymously: async () => {
    const result = await auth().signInAnonymously();
    return result.user;
  },

  /** Log out */
  signOut: async () => {
    await auth().signOut();
  },

  /** Get the currently logged-in user (null if not logged in) */
  getCurrentUser: () => {
    return auth().currentUser;
  },

  /** Watch for login/logout changes — call this in your app startup */
  onAuthStateChanged: (callback: (user: any) => void) => {
    return auth().onAuthStateChanged(callback);
  },
};
```

---

## 🔧 STEP 6 — Write the Firestore Service

Open `src/services/firestoreService.ts` and replace with:

```typescript
// src/services/firestoreService.ts
import firestore from '@react-native-firebase/firestore';
import { TripRecord } from '../types/models';

export const firestoreService = {

  /** Save or update a user's profile in the database */
  saveUserProfile: async (uid: string, profile: {
    name: string;
    email: string;
    createdAt: number;
  }) => {
    await firestore()
      .collection('users')
      .doc(uid)
      .set(profile, { merge: true }); // merge:true = don't delete existing fields
  },

  /** Get a user's profile from database */
  getUserProfile: async (uid: string) => {
    const doc = await firestore().collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  },

  /** Save a completed trip to history */
  saveTripRecord: async (uid: string, trip: TripRecord) => {
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('trips')
      .add(trip);
  },

  /** Get all past trips for a user */
  getTripHistory: async (uid: string): Promise<TripRecord[]> => {
    const snapshot = await firestore()
      .collection('users')
      .doc(uid)
      .collection('trips')
      .orderBy('startTime', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TripRecord[];
  },

  /** Update how many trips a user has done (for profile stats) */
  incrementTripCount: async (uid: string) => {
    await firestore()
      .collection('users')
      .doc(uid)
      .update({
        totalTrips: firestore.FieldValue.increment(1),
      });
  },
};
```

---

## 🔧 STEP 7 — Write the Auth Store (Global Login State)

The "store" is like a shared memory that all screens can read. Open `src/store/useAuthStore.ts` and replace with:

```typescript
// src/store/useAuthStore.ts
import { create } from 'zustand';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

interface AuthState {
  user: any | null;       // The logged-in Firebase user
  isLoading: boolean;     // True while checking if someone is logged in
  isLoggedIn: boolean;    // Quick check: are they logged in?
  error: string | null;   // Any error message to show

  // Actions (functions other screens can call)
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  error: null,

  /** Call this once when app starts — it checks if user is already logged in */
  initialize: () => {
    authService.onAuthStateChanged((user) => {
      set({
        user,
        isLoggedIn: !!user,  // !! converts to true/false
        isLoading: false,
      });
    });
  },

  /** Login with email + password */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  /** Sign up with name, email, password */
  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(email, password, name);
      // Save their profile to Firestore
      await firestoreService.saveUserProfile(user.uid, {
        name,
        email,
        createdAt: Date.now(),
      });
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  /** Login without account (guest) */
  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signInAnonymously();
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  /** Log out */
  logout: async () => {
    await authService.signOut();
    set({ user: null, isLoggedIn: false });
  },

  clearError: () => set({ error: null }),
}));
```

---

## 🔧 STEP 8 — Test Your Firebase Setup

Create a quick test file `src/services/firebaseTest.ts`:

```typescript
// Quick test — delete this file after testing
import { authService } from './authService';

export async function testFirebase() {
  try {
    // Test anonymous login
    const user = await authService.signInAnonymously();
    console.log('✅ Firebase works! User ID:', user.uid);
    await authService.signOut();
    console.log('✅ Sign out works!');
  } catch (error) {
    console.log('❌ Firebase error:', error);
  }
}
```

Call `testFirebase()` from `App.tsx` temporarily to confirm Firebase connects.

---

## 🔧 STEP 9 — Save and Push Your Work

```bash
# Save your work
git add .
git commit -m "feat: add Firebase auth service, Firestore service, and auth store"
git push origin feature/firebase-auth
```

---

## 🔁 How to Stay Updated with Main Branch

```bash
# Do this every day before working
git checkout main
git pull origin main
git checkout feature/firebase-auth
git merge main
```

---

## ✅ Your Checklist

- [ ] Firebase project created on console.firebase.google.com
- [ ] Email/Password auth enabled in Firebase console
- [ ] Firestore database created in test mode
- [ ] `google-services.json` placed in `android/app/`
- [ ] Android build.gradle files updated
- [ ] `src/config/firebase.ts` written
- [ ] `src/services/authService.ts` written
- [ ] `src/services/firestoreService.ts` written
- [ ] `src/store/useAuthStore.ts` written
- [ ] Firebase test passes (user can login anonymously)
- [ ] All pushed to `feature/firebase-auth` branch

---

## 📌 Files You Own (never let others edit these)

- `src/config/firebase.ts`
- `src/services/authService.ts`
- `src/services/firestoreService.ts`
- `src/store/useAuthStore.ts`
- `android/app/google-services.json`

---

## 🤝 What You Provide to the Rest of the Team

Member 4 (UI) will import from your store like this:
```typescript
import { useAuthStore } from '../store/useAuthStore';

// In a screen component:
const { isLoggedIn, login, user } = useAuthStore();
```

Member 5 (Components) will read `user` from your store to show profile info.
