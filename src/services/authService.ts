// src/services/authService.ts
// Wraps all Firebase Auth operations.
// Member 4's screens and Member 5's components should NOT import from firebase directly —
// they import from useAuthStore, which calls these functions.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../config/firebase';

// ─── Error message helper ─────────────────────────────────────────────────────
// Converts Firebase error codes into human-readable messages for the UI
function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && 'code' in error) {
    const code = (error as FirebaseError).code;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try logging in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email. Try signing up.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a moment and try again.';
      case 'auth/network-request-failed':
        return 'No internet connection. Check your Wi-Fi or mobile data.';
      case 'auth/admin-restricted-operation':
        return 'This Firebase auth method is disabled in the project. Enable Email/Password and Anonymous sign-in in the Firebase Console.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Contact support.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

// ─── Auth Service ─────────────────────────────────────────────────────────────
export const authService = {

  /**
   * Create a new account with email, password, and display name.
   * After creating the account, immediately saves the display name to the profile.
   */
  signUp: async (email: string, password: string, displayName: string): Promise<User> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Save the display name immediately after account creation
      await updateProfile(result.user, { displayName });
      return result.user;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Log in with email and password.
   */
  signIn: async (email: string, password: string): Promise<User> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Log in without creating an account (guest/anonymous mode).
   * Useful for people who want to try the app before committing.
   * Note: Anonymous accounts are deleted after 30 days of inactivity.
   */
  signInAnonymously: async (): Promise<User> => {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Log out the current user and clear their session.
   */
  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Get the currently logged-in user object.
   * Returns null if nobody is logged in.
   */
  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  /**
   * Watch for login/logout changes. Call this ONCE when the app starts.
   * Returns an unsubscribe function — call it when done to prevent memory leaks.
   *
   * @example
   * const unsubscribe = authService.onAuthStateChanged((user) => {
   *   if (user) console.log('Logged in:', user.uid);
   *   else console.log('Logged out');
   * });
   * // Later: unsubscribe();
   */
  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    return firebaseOnAuthStateChanged(auth, callback);
  },
};
