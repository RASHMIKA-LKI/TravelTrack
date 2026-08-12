// src/store/useAuthStore.ts
// Global authentication state — powered by Firebase Auth with offline support.

import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';
import { offlineSyncService } from '../services/offlineSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_GUEST_KEY = '@TravelTrack:offline_guest_session_v1';

type AuthAction =
  | 'initialize'
  | 'login'
  | 'register'
  | 'loginAsGuest'
  | 'logout'
  | 'resetPassword'
  | 'deleteAccount'
  | 'linkAnonymousAccount';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  loadingAction: AuthAction | null;
  isLoggedIn: boolean;
  error: string | null;

  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  deleteAccount: (password?: string) => Promise<boolean>;
  linkAnonymousAccount: (email: string, password: string, name: string) => Promise<boolean>;
  clearError: () => void;
}

let unsubscribeAuth: (() => void) | null = null;
let stopSync: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  loadingAction: 'initialize',
  isLoggedIn: false,
  error: null,

  initialize: () => {
    if (unsubscribeAuth) unsubscribeAuth();

    // Start background sync service loop
    if (!stopSync) {
      stopSync = offlineSyncService.startPeriodicSync(15000);
    }

    unsubscribeAuth = authService.onAuthStateChanged(async (user) => {
      if (user) {
        // Online or restored Firebase session
        await AsyncStorage.removeItem(OFFLINE_GUEST_KEY);
        set({
          user,
          isLoggedIn: true,
          isLoading: false,
          loadingAction: null,
        });
        // Cache user profile & attempt sync
        void firestoreService.saveUserProfile(user.uid, {
          name: user.displayName || user.email?.split('@')[0] || 'Traveler',
          email: user.email || '',
          createdAt: Date.now(),
        });
      } else {
        // Check if we have an offline guest session stored
        try {
          const rawGuest = await AsyncStorage.getItem(OFFLINE_GUEST_KEY);
          if (rawGuest) {
            const guestUser = JSON.parse(rawGuest) as User;
            set({
              user: guestUser,
              isLoggedIn: true,
              isLoading: false,
              loadingAction: null,
            });
            return;
          }
        } catch (e) {
          console.warn('Error reading offline guest session:', e);
        }

        set({
          user: null,
          isLoggedIn: false,
          isLoading: false,
          loadingAction: null,
        });
      }
    });
  },

  login: async (email, password) => {
    set({ loadingAction: 'login', isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      set({
        user,
        isLoggedIn: true,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      set({ error: message, loadingAction: null, isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ loadingAction: 'register', isLoading: true, error: null });
    try {
      const normalizedEmail = email.trim();
      const normalizedName = name.trim();
      const user = await authService.signUp(normalizedEmail, password, normalizedName);

      // Save profile (handles offline queue gracefully)
      await firestoreService.saveUserProfile(user.uid, {
        name: normalizedName,
        email: normalizedEmail,
        createdAt: Date.now(),
      });

      set({
        user,
        isLoggedIn: true,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      set({ error: message, loadingAction: null, isLoading: false });
    }
  },

  loginAsGuest: async () => {
    set({ loadingAction: 'loginAsGuest', isLoading: true, error: null });
    try {
      const user = await authService.signInAnonymously();
      set({
        user,
        isLoggedIn: true,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      // If offline when logging in as guest, fallback to local offline guest session
      console.warn('Firebase guest sign in failed (offline mode active), creating local guest session:', err);
      const offlineGuest: User = {
        uid: 'guest_' + Date.now(),
        isAnonymous: true,
        displayName: 'Guest Traveler',
        email: null,
      } as unknown as User;

      try {
        await AsyncStorage.setItem(OFFLINE_GUEST_KEY, JSON.stringify(offlineGuest));
      } catch (e) {
        console.warn('Could not save offline guest session:', e);
      }

      set({
        user: offlineGuest,
        isLoggedIn: true,
        loadingAction: null,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    set({ loadingAction: 'logout', isLoading: true });
    try {
      await AsyncStorage.removeItem(OFFLINE_GUEST_KEY);
      await authService.signOut();
    } catch (err: unknown) {
      console.warn('Sign out error:', err);
    }
    set({
      user: null,
      isLoggedIn: false,
      loadingAction: null,
      isLoading: false,
    });
  },

  resetPassword: async (email: string) => {
    set({ loadingAction: 'resetPassword', isLoading: true, error: null });
    try {
      await authService.resetPassword(email);
      set({ loadingAction: null, isLoading: false });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      set({ error: message, loadingAction: null, isLoading: false });
      return false;
    }
  },

  deleteAccount: async (password?: string) => {
    set({ loadingAction: 'deleteAccount', isLoading: true, error: null });
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await firestoreService.deleteUserData(currentUser.uid);
      }
      await AsyncStorage.removeItem(OFFLINE_GUEST_KEY);
      await authService.deleteAccount(password);

      set({
        user: null,
        isLoggedIn: false,
        loadingAction: null,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      set({ error: message, loadingAction: null, isLoading: false });
      return false;
    }
  },

  linkAnonymousAccount: async (email: string, password: string, name: string) => {
    set({ loadingAction: 'linkAnonymousAccount', isLoading: true, error: null });
    try {
      const normalizedEmail = email.trim();
      const normalizedName = name.trim();
      const user = await authService.linkAnonymousAccount(
        normalizedEmail,
        password,
        normalizedName
      );

      await AsyncStorage.removeItem(OFFLINE_GUEST_KEY);
      await firestoreService.saveUserProfile(user.uid, {
        name: normalizedName,
        email: normalizedEmail,
        createdAt: Date.now(),
      });

      set({
        user,
        isLoggedIn: true,
        loadingAction: null,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      set({ error: message, loadingAction: null, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
