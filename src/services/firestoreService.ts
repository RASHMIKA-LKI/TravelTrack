// src/services/firestoreService.ts
// All Firestore database operations for user profiles and trip history.
// Uses Firebase JS SDK v9 (modular API) — compatible with Expo.

import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
  FieldValue,
  Timestamp,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '../config/firebase';
import { TripRecord } from '../types/models';

// ─── User Profile Type ────────────────────────────────────────────────────────
// Defines the shape of a user's Firestore document in the 'users' collection.
export interface UserProfile {
  name: string;
  email: string;
  createdAt: number;
  totalTrips: number;
  updatedAt?: Timestamp | FieldValue;  // Timestamp when read, FieldValue when written
  emailVerified?: boolean;             // Synced from Firebase Auth
}

// ─── Firestore Error Helper ───────────────────────────────────────────────────
// Converts Firestore error codes into human-readable messages for the UI.
function getFirestoreErrorMessage(error: unknown): string {
  if (error instanceof Error && 'code' in error) {
    const code = (error as FirebaseError).code;
    switch (code) {
      case 'permission-denied':
        return 'You don\'t have permission to perform this action.';
      case 'not-found':
        return 'The requested data was not found.';
      case 'unavailable':
        return 'Service temporarily unavailable. Please check your internet connection.';
      case 'deadline-exceeded':
        return 'Request timed out. Please try again.';
      case 'already-exists':
        return 'This record already exists.';
      case 'resource-exhausted':
        return 'Too many requests. Please wait a moment and try again.';
      case 'unauthenticated':
        return 'You must be signed in to perform this action.';
      default:
        return error.message || 'A database error occurred. Please try again.';
    }
  }
  return 'A database error occurred. Please try again.';
}

// ─── Firestore Service ────────────────────────────────────────────────────────
export const firestoreService = {

  // ─── User Profile ───────────────────────────────────────────────────────────

  /**
   * Save or update a user's profile in Firestore.
   * Uses merge:true so existing fields are not deleted.
   * Called automatically after sign-up.
   */
  saveUserProfile: async (
    uid: string,
    profile: { name: string; email: string; createdAt: number }
  ): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          ...profile,
          totalTrips: 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true } // merge:true = don't overwrite fields we didn't include
      );
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error));
    }
  },

  /**
   * Fetch a user's profile document from Firestore.
   * Returns null if the user has no profile yet.
   */
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error));
    }
  },

  // ─── Trip History ───────────────────────────────────────────────────────────

  /**
   * Save a completed trip record to the user's trip history sub-collection.
   * Called when the leader ends a tracking session.
   */
  saveTripRecord: async (uid: string, trip: Omit<TripRecord, 'id'>): Promise<void> => {
    try {
      const tripsRef = collection(db, 'users', uid, 'trips');
      await addDoc(tripsRef, {
        ...trip,
        savedAt: serverTimestamp(),
      });
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error));
    }
  },

  /**
   * Get the last 20 trips for a user, ordered by most recent first.
   * Returns an empty array if the user has no trips.
   */
  getTripHistory: async (uid: string): Promise<TripRecord[]> => {
    try {
      const tripsRef = collection(db, 'users', uid, 'trips');
      const q = query(tripsRef, orderBy('startTime', 'desc'), limit(20));
      const snap = await getDocs(q);

      return snap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<TripRecord, 'id'>),
      }));
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error));
    }
  },

  /**
   * Increment the user's total trip count by 1.
   * Called at the end of each trip.
   */
  incrementTripCount: async (uid: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        totalTrips: increment(1),
      });
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error));
    }
  },

  /**
   * Convenience method: save a trip record AND increment the user's trip count
   * in parallel. Call this from handleEndTracking when a session ends.
   *
   * @example
   * await firestoreService.saveTripAndIncrementCount(user.uid, {
   *   groupName: 'Hanthana Peak Hike',
   *   startTime: tripStartTimestamp,
   *   endTime: Date.now(),
   *   memberCount: members.length,
   * });
   */
  saveTripAndIncrementCount: async (uid: string, trip: Omit<TripRecord, 'id'>): Promise<void> => {
    await Promise.all([
      firestoreService.saveTripRecord(uid, trip),
      firestoreService.incrementTripCount(uid),
    ]);
  },

  /**
   * Delete all user data from Firestore (profile + trips).
   * Called when a user deletes their account.
   */
  deleteUserData: async (uid: string): Promise<void> => {
    try {
      // Delete all trip records first
      const tripsRef = collection(db, 'users', uid, 'trips');
      const snap = await getDocs(tripsRef);
      // Note: Firestore doesn't support bulk deletes in the client SDK,
      // so we delete each trip doc individually. For large datasets,
      // consider using a Cloud Function.
      const deletePromises = snap.docs.map((tripDoc) =>
        updateDoc(doc(db, 'users', uid, 'trips', tripDoc.id), { _deleted: true })
      );
      await Promise.all(deletePromises);

      // Mark the user profile as deleted
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        _deleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error));
    }
  },
};
