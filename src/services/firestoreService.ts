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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TripRecord } from '../types/models';

// ─── User Profile ─────────────────────────────────────────────────────────────

export const firestoreService = {

  /**
   * Save or update a user's profile in Firestore.
   * Uses merge:true so existing fields are not deleted.
   * Called automatically after sign-up.
   */
  saveUserProfile: async (
    uid: string,
    profile: { name: string; email: string; createdAt: number }
  ): Promise<void> => {
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
  },

  /**
   * Fetch a user's profile document from Firestore.
   * Returns null if the user has no profile yet.
   */
  getUserProfile: async (uid: string): Promise<Record<string, any> | null> => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  },

  // ─── Trip History ───────────────────────────────────────────────────────────

  /**
   * Save a completed trip record to the user's trip history sub-collection.
   * Called when the leader ends a tracking session.
   */
  saveTripRecord: async (uid: string, trip: Omit<TripRecord, 'id'>): Promise<void> => {
    const tripsRef = collection(db, 'users', uid, 'trips');
    await addDoc(tripsRef, {
      ...trip,
      savedAt: serverTimestamp(),
    });
  },

  /**
   * Get the last 20 trips for a user, ordered by most recent first.
   * Returns an empty array if the user has no trips.
   */
  getTripHistory: async (uid: string): Promise<TripRecord[]> => {
    const tripsRef = collection(db, 'users', uid, 'trips');
    const q = query(tripsRef, orderBy('startTime', 'desc'), limit(20));
    const snap = await getDocs(q);

    return snap.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<TripRecord, 'id'>),
    }));
  },

  /**
   * Increment the user's total trip count by 1.
   * Called at the end of each trip.
   */
  incrementTripCount: async (uid: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      totalTrips: increment(1),
    });
  },
};
