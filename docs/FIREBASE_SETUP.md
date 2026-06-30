# 🔥 Firebase Setup — Member 2

> **This file must be read before running the app for the first time.**

---

## 🔴 Required: Fill in Your Firebase Config Keys

After cloning the repo and switching to the `feature/firebase-auth` branch, you **must** paste your real Firebase project credentials into [`src/config/firebase.ts`](../src/config/firebase.ts) before the app will connect to Firebase.

Open the file and replace all `YOUR_...` placeholders:

```ts
// src/config/firebase.ts

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',                         // ← from Firebase Console
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',  // ← your project ID
  projectId: 'YOUR_PROJECT_ID',                   // ← your project ID
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',   // ← your project ID
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',  // ← from Firebase Console
  appId: 'YOUR_APP_ID',                           // ← from Firebase Console
};
```

### Where to find these values

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**
2. Open your **TravelTrack** project
3. Click **⚙️ Project Settings** (gear icon, top-left)
4. Scroll to **"Your apps"** section
5. Click the **`</>` Web app** icon (not Android)
6. Your `firebaseConfig` object is shown there — copy each value

> ⚠️ **Never commit real API keys to GitHub.** For a team project, share the config
> privately (e.g. over WhatsApp/Discord) or add `src/config/firebase.ts` to `.gitignore`.

---

## ✅ Firebase Console Checklist

Before testing, confirm these are enabled in your Firebase project:

- [ ] **Authentication** → Sign-in method → **Email/Password** — Enabled
- [ ] **Authentication** → Sign-in method → **Anonymous** — Enabled
- [ ] **Firestore Database** — Created (Start in **test mode** for development)

---

## 📦 Packages Already Installed

These were added to `package.json` and are installed via `npm install`:

| Package | Purpose |
|---------|---------|
| `firebase` v12 | Firebase JS SDK — Auth + Firestore |
| `@react-native-async-storage/async-storage` | Saves login session to device so users stay logged in |

---

## 🗂️ Files Owned by Member 2

| File | What It Does |
|------|-------------|
| `src/config/firebase.ts` | Firebase app init, Auth (with session persistence), Firestore |
| `src/services/authService.ts` | signUp, signIn, signInAnonymously, signOut — with friendly error messages |
| `src/services/firestoreService.ts` | Save/get user profile, save/get trip history, increment trip count |
| `src/store/useAuthStore.ts` | Global Zustand auth state — login, register, guest, logout |

---

## 🧪 How to Test After Setup

```bash
# Install dependencies
npm install

# Start the app
npm start
```

1. Open app → **Login screen** → tap **Sign Up**
2. Enter name, email, password → submit
3. Check Firebase Console → **Authentication** → Users → your user appears ✅
4. Check Firebase Console → **Firestore** → `users` collection → profile document ✅
5. Log out → **Log In** with same credentials → navigates to Home ✅
6. **Continue as Guest** → navigates to Home as anonymous user ✅
7. Force-close app → reopen → **still logged in** (session persisted via AsyncStorage) ✅

---

## 🤝 What This Provides to Other Members

### Member 4 (UI Screens)
LoginScreen already imports and uses `useAuthStore` — it works automatically once Firebase keys are filled in.

### Member 5 (Components)
Read `user` from the auth store to display profile info:
```ts
import { useAuthStore } from '../store/useAuthStore';

const { user, isLoggedIn } = useAuthStore();
// user.displayName → the user's name
// user.email       → the user's email
// user.uid         → the unique user ID
```

### Member 3 / Member 5 (Trip History)
When a trip ends, call:
```ts
import { firestoreService } from '../services/firestoreService';

await firestoreService.saveTripRecord(uid, { groupName, startTime, endTime, memberCount });
await firestoreService.incrementTripCount(uid);
```
