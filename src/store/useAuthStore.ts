// src/store/useAuthStore.ts
// Global authentication state — powered by Firebase Auth.
// All screens read from this store; none call Firebase directly.

import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

interface AuthState {
  user: User | null;        // The logged-in Firebase User object (null = not logged in)
  isLoading: boolean;       // True while Firebase checks if a session exists on startup
  isLoggedIn: boolean;      // Shortcut: true if user !== null
  error: string | null;     // Human-readable error message to display in the UI

  // ─── Actions ─────────────────────────────────────────────────────────────
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,   // Start as true — Firebase needs a moment to restore the session
  isLoggedIn: false,
  error: null,

  /**
   * Call this ONCE when the app starts (in AppNavigator useEffect).
   * Firebase will immediately restore any existing session from AsyncStorage,
   * so the user won't need to log in every time they open the app.
   */
  initialize: () => {
    authService.onAuthStateChanged((user) => {
      set({
        user,
        isLoggedIn: !!user,
        isLoading: false,
      });
    });
  },

  /** Log in with email + password */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * Create a new account with email, password, and display name.
   * Also saves the user profile to Firestore automatically.
   */
  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(email, password, name);
      // Save profile to Firestore in the background — don't block navigation
      firestoreService.saveUserProfile(user.uid, {
        name,
        email,
        createdAt: Date.now(),
      }).catch((err) => console.warn('Profile save failed (non-critical):', err));
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  /** Log in without an account (anonymous/guest mode) */
  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signInAnonymously();
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  /** Log out and clear the session */
  logout: async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    set({ user: null, isLoggedIn: false });
  },

  /** Clear any displayed error message */
  clearError: () => set({ error: null }),
}));

