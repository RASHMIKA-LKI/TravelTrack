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
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../config/firebase';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validators';

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
      case 'auth/requires-recent-login':
        return 'This action requires a recent login. Please sign out and sign back in.';
      case 'auth/user-token-expired':
        return 'Your session has expired. Please sign in again.';
      case 'auth/provider-already-linked':
        return 'This account is already linked to an email.';
      case 'auth/credential-already-in-use':
        return 'This email is already associated with another account.';
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
   * Validates all inputs on the client side before hitting Firebase.
   */
  signUp: async (email: string, password: string, displayName: string): Promise<User> => {
    // Validate before hitting Firebase to give instant feedback and save API calls
    const emailErr = validateEmail(email);
    if (emailErr) throw new Error(emailErr);
    const passErr = validatePassword(password);
    if (passErr) throw new Error(passErr);
    const nameErr = validateDisplayName(displayName);
    if (nameErr) throw new Error(nameErr);

    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Save the display name immediately after account creation
      await updateProfile(result.user, { displayName: displayName.trim() });
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
   * Send a password reset email to the given address.
   * Firebase will send the email even if the address is not registered
   * (to prevent email enumeration attacks).
   */
  resetPassword: async (email: string): Promise<void> => {
    const emailErr = validateEmail(email);
    if (emailErr) throw new Error(emailErr);

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  // ─── Anonymous → Permanent Account Linking ────────────────────────────────

  /**
   * Convert an anonymous (guest) account into a permanent email/password account.
   * This preserves the user's UID and all their data — no data loss.
   *
   * After linking, the user can log in with email/password on any device.
   *
   * @param email - The email to link to the account
   * @param password - The password for the new permanent account
   * @param displayName - The user's display name
   */
  linkAnonymousAccount: async (email: string, password: string, displayName: string): Promise<User> => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in.');
    if (!user.isAnonymous) throw new Error('This account is already a permanent account.');

    // Validate inputs first
    const emailErr = validateEmail(email);
    if (emailErr) throw new Error(emailErr);
    const passErr = validatePassword(password);
    if (passErr) throw new Error(passErr);
    const nameErr = validateDisplayName(displayName);
    if (nameErr) throw new Error(nameErr);

    try {
      const credential = EmailAuthProvider.credential(email.trim(), password);
      const result = await linkWithCredential(user, credential);
      await updateProfile(result.user, { displayName: displayName.trim() });

      return result.user;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  // ─── Account Management ───────────────────────────────────────────────────

  /**
   * Permanently delete the current user's account.
   * Requires re-authentication for security (Firebase enforces this
   * for sensitive operations like account deletion).
   *
   * @param password - Required for email/password users to re-authenticate.
   *                   Not needed for anonymous users.
   */
  deleteAccount: async (password?: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in.');

    try {
      // Re-authenticate before deletion (required by Firebase for security)
      if (password && user.email) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }
      await deleteUser(user);
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
