// src/store/useAuthStore.ts
// Global authentication state — powered by Firebase Auth + offline fallback.
// All screens read from this store; none call Firebase directly.
//
// OFFLINE-FIRST: When internet is unavailable, Guest Mode creates a local-only
// user stored in AsyncStorage. When internet returns, the local user is silently
// synced to a real Firebase anonymous account and all cached data is uploaded.

import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';
import { offlineService, OfflineUser } from '../services/offlineService';

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
  | 'linkAnonymousAccount'
  | 'syncOfflineToFirebase';

/** The user can be a Firebase User, an offline local user, or null (not logged in) */
type AppUser = User | OfflineUser | null;

interface AuthState {
  user: AppUser;                    // Firebase User, offline user, or null
  isLoading: boolean;               // True if ANY action is loading (backward compat for UI)
  loadingAction: AuthAction | null; // WHICH specific action is loading (null = idle)
  isLoggedIn: boolean;              // Shortcut: true if user !== null
  isOfflineUser: boolean;           // True if using a local-only user (no Firebase)
  isEmailVerified: boolean;         // Whether the user has verified their email
  error: string | null;             // Human-readable error message to display in the UI

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
  syncOfflineToFirebase: () => Promise<boolean>;
  clearError: () => void;
  skipToLogin: boolean;
  setSkipToLogin: (val: boolean) => void;
}

// Store the auth listener unsubscribe function at module level
// so we can clean it up and prevent double-subscription on Fast Refresh
let unsubscribeAuth: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,        // Start as true — Firebase needs a moment to restore the session
  loadingAction: 'initialize',
  isLoggedIn: false,
  isOfflineUser: false,
  isEmailVerified: false,
  error: null,
  skipToLogin: false,

  /**
   * Call this ONCE when the app starts (in AppNavigator useEffect).
   * Restores the user session from either Firebase (via AsyncStorage persistence)
   * or from a saved offline user.
   */
  initialize: () => {
    // Prevent double-subscription on Fast Refresh
    if (unsubscribeAuth) unsubscribeAuth();

    unsubscribeAuth = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase user restored from cache — check if we have offline data to sync
        const wasOffline = get().isOfflineUser;
        if (wasOffline) {
          // User was offline but now has a Firebase account — sync cached trips
          try {
            const synced = await offlineService.syncCachedTrips(
              firebaseUser.uid,
              firestoreService.saveTripRecord
            );
            if (synced > 0) console.log(`✅ Synced ${synced} cached trip(s) to Firebase`);
            await offlineService.clearOfflineUser();
          } catch {
            // Non-critical — trips stay cached for next sync attempt
          }
        }

        set({
          user: firebaseUser,
          isLoggedIn: true,
          isOfflineUser: false,
          isEmailVerified: firebaseUser.emailVerified ?? false,
          isLoading: false,
          loadingAction: null,
        });
      } else {
        // No Firebase user — check if we have a saved offline user
        try {
          const savedOfflineUser = await offlineService.getOfflineUser();
          if (savedOfflineUser) {
            set({
              user: savedOfflineUser,
              isLoggedIn: true,
              isOfflineUser: true,
              isEmailVerified: false,
              isLoading: false,
              loadingAction: null,
            });
            return; // Don't fall through to logged-out state
          }
        } catch {
          // AsyncStorage read failed — treat as logged out
        }

        // No user at all — show login screen
        set({
          user: null,
          isLoggedIn: false,
          isOfflineUser: false,
          isEmailVerified: false,
          isLoading: false,
          loadingAction: null,
        });
      }
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
        isOfflineUser: false,
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

      // Remove verification email — email verification is not used in this app

      set({
        user,
        isLoggedIn: true,
        isOfflineUser: false,
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

  /**
   * Log in without an account (guest mode).
   * OFFLINE-FIRST: Tries Firebase first. If no internet, falls back to
   * creating a local-only user that works entirely offline.
   */
  loginAsGuest: async () => {
    set({ loadingAction: 'loginAsGuest', isLoading: true, error: null });
    try {
      // Try Firebase first (needs internet)
      const user = await authService.signInAnonymously();
      set({
        user,
        isLoggedIn: true,
        isOfflineUser: false,
        isEmailVerified: false,
        loadingAction: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      // Check if it's a network error — if so, fall back to offline mode
      const message = err instanceof Error ? err.message : '';
      const isNetworkError =
        message.toLowerCase().includes('internet') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('unavailable') ||
        message.toLowerCase().includes('offline');

      if (isNetworkError) {
        // No internet — create a local-only user instead
        try {
          const offlineUser = await offlineService.createOfflineUser();
          set({
            user: offlineUser,
            isLoggedIn: true,
            isOfflineUser: true,
            isEmailVerified: false,
            loadingAction: null,
            isLoading: false,
            // No error — offline mode is a valid state, not an error
          });
        } catch (offlineErr: unknown) {
          // AsyncStorage itself failed — this is truly broken
          const offlineMessage = offlineErr instanceof Error
            ? offlineErr.message
            : 'Failed to create offline session.';
          if (get().loadingAction === 'loginAsGuest') {
            set({ error: offlineMessage, loadingAction: null, isLoading: false });
          }
        }
      } else {
        // Non-network error (e.g. auth disabled in Firebase Console) — show the real error
        if (get().loadingAction === 'loginAsGuest') {
          set({ error: message, loadingAction: null, isLoading: false });
        } else {
          set({ error: message });
        }
      }
    }
  },

  /** Log out and clear all session data (Firebase + offline) */
  logout: async () => {
    set({ loadingAction: 'logout', isLoading: true });

    const wasOffline = get().isOfflineUser;

    // Sign out of Firebase (if applicable)
    if (!wasOffline) {
      try {
        await authService.signOut();
      } catch (err: unknown) {
        console.warn('Sign out error:', err);
      }
    }

    // Always clear offline data on logout
    try {
      await offlineService.clearAllOfflineData();
    } catch {
      // Non-critical
    }

    set({
      user: null,
      isLoggedIn: false,
      isOfflineUser: false,
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
      const wasOffline = get().isOfflineUser;

      if (wasOffline) {
        // Offline user — just clear local data
        await offlineService.clearAllOfflineData();
      } else {
        // Firebase user — clean up Firestore data first
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          try {
            await firestoreService.deleteUserData(currentUser.uid);
          } catch (dbErr: unknown) {
            console.warn('Firestore cleanup failed (non-critical):', dbErr);
          }
        }
        await authService.deleteAccount(password);
      }

      set({
        user: null,
        isLoggedIn: false,
        isOfflineUser: false,
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
   * Skipped for offline users (they don't have emails).
   */
  sendVerificationEmail: async () => {
    if (get().isOfflineUser) return false; // Offline users don't have emails

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
   * Skipped for offline users.
   */
  refreshEmailVerified: async () => {
    if (get().isOfflineUser) return;

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
   * Convert a guest (anonymous or offline) account into a permanent account.
   * For offline users, this first syncs to Firebase, then links.
   * Returns true if linking was successful, false otherwise.
   */
  linkAnonymousAccount: async (email: string, password: string, name: string) => {
    set({ loadingAction: 'linkAnonymousAccount', isLoading: true, error: null });
    try {
      const wasOffline = get().isOfflineUser;

      // If offline user, we need to create a Firebase account first
      if (wasOffline) {
        // First sync to Firebase anonymous account
        const synced = await get().syncOfflineToFirebase();
        if (!synced) {
          throw new Error('Cannot link account — no internet connection.');
        }
      }

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
        isOfflineUser: false,
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

  // ─── Offline → Firebase Sync ──────────────────────────────────────────────

  /**
   * Attempt to sync an offline user to a real Firebase anonymous account.
   * If internet is available, creates a Firebase account, uploads cached trips,
   * and clears the offline data. Returns true if sync succeeded.
   *
   * This can be called manually or triggered automatically when internet
   * connectivity is detected.
   */
  syncOfflineToFirebase: async () => {
    const { user, isOfflineUser } = get();
    if (!isOfflineUser || !user) return false;

    set({ loadingAction: 'syncOfflineToFirebase', isLoading: true, error: null });
    try {
      // Create a real Firebase anonymous account
      const firebaseUser = await authService.signInAnonymously();

      // Sync any cached trips to Firestore
      try {
        const synced = await offlineService.syncCachedTrips(
          firebaseUser.uid,
          firestoreService.saveTripRecord
        );
        if (synced > 0) console.log(`✅ Synced ${synced} cached trip(s) to Firebase`);
      } catch {
        // Trip sync failed but account creation succeeded — trips stay cached
        console.warn('Trip sync failed (will retry next time)');
      }

      // Clean up offline data
      await offlineService.clearOfflineUser();

      set({
        user: firebaseUser,
        isLoggedIn: true,
        isOfflineUser: false,
        loadingAction: null,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      // Still offline — that's fine, stay in offline mode
      if (get().loadingAction === 'syncOfflineToFirebase') {
        set({ loadingAction: null, isLoading: false });
      }
      return false;
    }
  },

  /** Clear any displayed error message */
  clearError: () => set({ error: null }),

  /** Set the skipToLogin flag (used when offline user taps Log In) */
  setSkipToLogin: (val: boolean) => set({ skipToLogin: val }),
}));
