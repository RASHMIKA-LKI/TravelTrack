// src/services/firestoreService.ts
// All Firestore database operations for user profiles and trip history.
// Modular v9 API — enhanced with offline-first local storage and automatic sync.

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
import { offlineSyncService, ExtendedTripRecord } from './offlineSyncService';

// ─── User Profile Type ────────────────────────────────────────────────────────
export interface UserProfile {
  name: string;
  email: string;
  createdAt: number;
  totalTrips: number;
  updatedAt?: Timestamp | FieldValue | number;
}

// ─── Firestore Error Helper ───────────────────────────────────────────────────
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
   * Save or update a user's profile.
   * Saves to local storage first, then attempts Firestore push.
   * If offline, enqueues profile update for automatic cloud backup.
   */
  saveUserProfile: async (
    uid: string,
    profile: { name: string; email: string; createdAt: number }
  ): Promise<void> => {
    // Cache profile locally immediately
    await offlineSyncService.cacheUserProfileLocally(uid, {
      ...profile,
      totalTrips: 0,
      updatedAt: Date.now(),
    });

    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          ...profile,
          totalTrips: 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('[FirestoreService] Profile sync failed, enqueuing for background sync:', error);
      await offlineSyncService.enqueueItem({
        id: 'prof_' + Date.now(),
        type: 'SAVE_PROFILE',
        uid,
        payload: profile,
        createdAt: Date.now(),
        retryCount: 0,
      });
    }
  },

  /**
   * Fetch a user's profile document.
   * Falls back to local cached profile if offline or network error occurs.
   */
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Update local cache with latest server data
        await offlineSyncService.cacheUserProfileLocally(uid, data);
        return data;
      }
      return null;
    } catch (error) {
      console.warn('[FirestoreService] Could not reach Firestore, reading cached profile:', error);
      return await offlineSyncService.getCachedUserProfile(uid);
    }
  },

  // ─── Trip History ───────────────────────────────────────────────────────────

  /**
   * Save a completed trip record locally and enqueue cloud sync.
   * Called when the leader or member ends a tracking session.
   */
  saveTripRecord: async (uid: string, trip: Omit<TripRecord, 'id'>): Promise<ExtendedTripRecord> => {
    return await offlineSyncService.saveTripLocally(uid, trip);
  },

  /**
   * Get combined trip history (Firestore cloud records + pending local records).
   */
  getTripHistory: async (uid: string): Promise<ExtendedTripRecord[]> => {
    const localTrips = await offlineSyncService.getLocalTripRecords(uid);

    let remoteTrips: ExtendedTripRecord[] = [];
    try {
      const tripsRef = collection(db, 'users', uid, 'trips');
      const q = query(tripsRef, orderBy('startTime', 'desc'), limit(20));
      const snap = await getDocs(q);

      remoteTrips = snap.docs.map((document) => ({
        id: document.id,
        syncStatus: 'synced' as const,
        ...(document.data() as Omit<TripRecord, 'id'>),
      }));
    } catch (error) {
      console.warn('[FirestoreService] Could not fetch remote trip history (offline mode active):', error);
    }

    // Merge & deduplicate local vs remote trips by startTime and groupName
    const combinedMap = new Map<string, ExtendedTripRecord>();

    // Add remote trips first
    for (const rTrip of remoteTrips) {
      const key = `${rTrip.startTime}_${rTrip.groupName}`;
      combinedMap.set(key, rTrip);
    }

    // Overlay local trips (preferring local pending status if unsynced)
    for (const lTrip of localTrips) {
      const key = `${lTrip.startTime}_${lTrip.groupName}`;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, lTrip);
      } else {
        // If already in remote, ensure marked as synced locally
        const existing = combinedMap.get(key)!;
        if (existing.syncStatus !== 'pending') {
          lTrip.syncStatus = 'synced';
        }
      }
    }

    // Sort by startTime descending
    const result = Array.from(combinedMap.values()).sort((a, b) => b.startTime - a.startTime);
    return result;
  },

  /**
   * Increment the user's total trip count by 1.
   */
  incrementTripCount: async (uid: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        totalTrips: increment(1),
      });
    } catch (error) {
      console.warn('[FirestoreService] Increment count failed offline, queueing:', error);
      await offlineSyncService.enqueueItem({
        id: 'inc_' + Date.now(),
        type: 'INCREMENT_COUNT',
        uid,
        payload: {},
        createdAt: Date.now(),
        retryCount: 0,
      });
    }
  },

  /**
   * Saves trip record to local storage immediately and queues background sync.
   * Completely safe offline — will NEVER throw or block ending/leaving a trip.
   */
  saveTripAndIncrementCount: async (uid: string, trip: Omit<TripRecord, 'id'>): Promise<ExtendedTripRecord> => {
    return await offlineSyncService.saveTripLocally(uid, trip);
  },

  /**
   * Delete all user data.
   */
  deleteUserData: async (uid: string): Promise<void> => {
    try {
      const tripsRef = collection(db, 'users', uid, 'trips');
      const snap = await getDocs(tripsRef);
      const deletePromises = snap.docs.map((tripDoc) =>
        updateDoc(doc(db, 'users', uid, 'trips', tripDoc.id), { _deleted: true })
      );
      await Promise.all(deletePromises);

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        _deleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('[FirestoreService] Delete user data offline error:', error);
    }
  },
};
