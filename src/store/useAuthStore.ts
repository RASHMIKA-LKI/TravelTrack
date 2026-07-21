// src/store/useAuthStore.ts
// Global authentication state — powered by Firebase Auth.
// All screens read from this store; none call Firebase directly.

import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

// ─── Types ────────────────────────────────────────────────────────────────────

/** All possible auth operations that can be in a loading state */
type AuthAction =
  | 'initialize'
  | 'login'
  | 'register'
  | 'loginAsGuest'
  | 'logout'
  | 'resetPassword'
  | 'deleteAccount'
  | 'sendVerificationEmail'
  | 'refreshEmailVerified'
  | 'linkAnonymousAccount';

interface AuthState {
  user: User | null;                  // The logged-in Firebase User object (null = not logged in)
  isLoading: boolean;                 // True if ANY action is loading (backward compat for UI)
  loadingAction: AuthAction | null;   // WHICH specific action is loading (null = idle)
  isLoggedIn: boolean;                // Shortcut: true if user !== null
  isEmailVerified: boolean;           // Whether the user has verified their email
  error: string | null;               // Human-readable error message to display in the UI

  // ─── Actions ─────────────────────────────────────────────────────────────
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  deleteAccount: (password?: string) => Promise<boolean>;
  sendVerificationEmail: () => Promise<boolean>;
  refreshEmailVerified: () => Promise<void>;
  linkAnonymousAccount: (email: string, password: string, name: string) => Promise<boolean>;
  clearError: () => void;
}

// Store the auth listener unsubscribe function at module level
// so we can clean it up and prevent double-subscription on Fast Refresh
let unsubscribeAuth: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,        // Start as true — Firebase needs a moment to restore the session
  loadingAction: 'initialize',
  isLoggedIn: false,
  isEmailVerified: false,
  error: null,

  /**
   * Call this ONCE when the app starts (in AppNavigator useEffect).
   * Firebase will immediately restore any existing session from AsyncStorage,
   * so the user won't need to log in every time they open the app.
   */
  initialize: () => {
    // Prevent double-subscription on Fast Refresh
    if (unsubscribeAuth) unsubscribeAuth();

    unsubscribeAuth = authService.onAuthStateChanged((user) => {
      set({
        user,
        isLoggedIn: !!user,
        isEmailVerified: user?.emailVerified ?? false,
        isLoading: false,
        loadingAction: null,
      });
    });
  },

  /** Log in with email + password (requires internet) */
  login: async (email, password) => {
    set({ loadingAction: 'login', isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      set({
        user,
        isLoggedIn: true,
        isEmailVerified: user.emailVerified ?? false,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'login') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
    }
  },

  /**
   * Create a new account with email, password, and display name.
   * Also saves the user profile to Firestore.
   * Requires internet.
   */
  register: async (email, password, name) => {
    set({ loadingAction: 'register', isLoading: true, error: null });
    try {
      const user = await authService.signUp(email, password, name);

      // Save profile to Firestore — await it so we don't silently lose data
      try {
        await firestoreService.saveUserProfile(user.uid, {
          name,
          email,
          createdAt: Date.now(),
        });
      } catch (profileErr: unknown) {
        // Profile save failed but auth succeeded — log but don't block the user
        console.warn('Profile save failed (will retry on next app open):', profileErr);
      }

      set({
        user,
        isLoggedIn: true,
        isEmailVerified: true,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'register') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
    }
  },

  /** Log in without an account (anonymous/guest mode) */
  loginAsGuest: async () => {
    set({ loadingAction: 'loginAsGuest', isLoading: true, error: null });
    try {
      const user = await authService.signInAnonymously();
      set({
        user,
        isLoggedIn: true,
        isEmailVerified: false,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'loginAsGuest') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
    }
  },

  /** Log out and clear the session */
  logout: async () => {
    set({ loadingAction: 'logout', isLoading: true });
    try {
      await authService.signOut();
    } catch (err: unknown) {
      console.warn('Sign out error:', err);
    }
    set({
      user: null,
      isLoggedIn: false,
      isEmailVerified: false,
      loadingAction: null,
      isLoading: false,
    });
  },

  /**
   * Send a password reset email to the given address.
   * Returns true if the email was sent successfully, false otherwise.
   */
  resetPassword: async (email: string) => {
    set({ loadingAction: 'resetPassword', isLoading: true, error: null });
    try {
      await authService.resetPassword(email);
      if (get().loadingAction === 'resetPassword') {
        set({ loadingAction: null, isLoading: false });
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'resetPassword') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
      return false;
    }
  },

  /**
   * Permanently delete the current user's account and all their data.
   * Returns true if deletion was successful, false otherwise.
   */
  deleteAccount: async (password?: string) => {
    set({ loadingAction: 'deleteAccount', isLoading: true, error: null });
    try {
      // Clean up Firestore data first
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          await firestoreService.deleteUserData(currentUser.uid);
        } catch (dbErr: unknown) {
          console.warn('Firestore cleanup failed (non-critical):', dbErr);
        }
      }
      await authService.deleteAccount(password);

      set({
        user: null,
        isLoggedIn: false,
        isEmailVerified: false,
        loadingAction: null,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'deleteAccount') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
      return false;
    }
  },

  // ─── Email Verification ───────────────────────────────────────────────────

  /**
   * Send a verification email to the current user.
   * Returns true if sent successfully, false otherwise.
   */
  sendVerificationEmail: async () => {
    set({ loadingAction: 'sendVerificationEmail', isLoading: true, error: null });
    try {
      await authService.sendVerificationEmail();
      if (get().loadingAction === 'sendVerificationEmail') {
        set({ loadingAction: null, isLoading: false });
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'sendVerificationEmail') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
      return false;
    }
  },

  /**
   * Reload the user from Firebase and update isEmailVerified status.
   */
  refreshEmailVerified: async () => {
    try {
      await authService.reloadUser();
      const verified = authService.isEmailVerified();
      set({ isEmailVerified: verified });
    } catch (err: unknown) {
      console.warn('Failed to refresh email verification status:', err);
    }
  },

  // ─── Anonymous → Permanent Account Linking ────────────────────────────────

  /**
   * Convert a guest (anonymous) account into a permanent account.
   * Returns true if linking was successful, false otherwise.
   */
  linkAnonymousAccount: async (email: string, password: string, name: string) => {
    set({ loadingAction: 'linkAnonymousAccount', isLoading: true, error: null });
    try {
      const user = await authService.linkAnonymousAccount(email, password, name);

      // Save profile to Firestore
      try {
        await firestoreService.saveUserProfile(user.uid, {
          name,
          email,
          createdAt: Date.now(),
        });
      } catch (profileErr: unknown) {
        console.warn('Profile save failed after account linking:', profileErr);
      }

      set({
        user,
        isLoggedIn: true,
        isEmailVerified: false,
        loadingAction: null,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (get().loadingAction === 'linkAnonymousAccount') {
        set({ error: message, loadingAction: null, isLoading: false });
      } else {
        set({ error: message });
      }
      return false;
    }
  },

  /** Clear any displayed error message */
  clearError: () => set({ error: null }),
}));
