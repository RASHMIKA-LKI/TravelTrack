// src/services/offlineService.ts
// Handles offline-first Guest Mode: local user creation, trip caching,
// and automatic sync to Firebase when internet becomes available.
// Uses AsyncStorage only — zero network calls, zero Firebase dependencies.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripRecord } from '../types/models';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const OFFLINE_USER_KEY = '@TravelTrack:offlineUser';
const CACHED_TRIPS_KEY = '@TravelTrack:cachedTrips';

// ─── Offline User Type ────────────────────────────────────────────────────────
// A minimal user-like object that has the same properties the app reads
// from Firebase's User object. This lets all screens (HomeScreen,
// TrackingScreen, useLocation) work identically without knowing
// whether the user is online or offline.

export interface OfflineUser {
  uid: string;              // Locally generated unique ID
  displayName: string;      // 'Guest' by default
  email: string | null;     // null for offline guests
  isAnonymous: boolean;     // always true
  emailVerified: boolean;   // always false
  _isOffline: true;         // Marker to distinguish from Firebase User
}

// ─── Generate Unique ID ───────────────────────────────────────────────────────
// No external dependency needed. This creates a unique enough ID for local use.
// Format: "offline_<timestamp>_<random>" — guaranteed unique per device.
function generateLocalUid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 11);
  return `offline_${timestamp}_${random}`;
}

// ─── Offline Service ──────────────────────────────────────────────────────────
export const offlineService = {

  // ─── User Management ──────────────────────────────────────────────────────

  /**
   * Create a new offline-only user and save it to AsyncStorage.
   * Called when Guest Mode fails due to no internet connection.
   * The user can start using the app immediately with this local identity.
   */
  createOfflineUser: async (): Promise<OfflineUser> => {
    const offlineUser: OfflineUser = {
      uid: generateLocalUid(),
      displayName: 'Guest',
      email: null,
      isAnonymous: true,
      emailVerified: false,
      _isOffline: true,
    };

    await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(offlineUser));
    return offlineUser;
  },

  /**
   * Load a previously saved offline user from AsyncStorage.
   * Returns null if no offline user exists (user either never used
   * offline mode or has already synced to Firebase).
   */
  getOfflineUser: async (): Promise<OfflineUser | null> => {
    try {
      const json = await AsyncStorage.getItem(OFFLINE_USER_KEY);
      if (!json) return null;

      const parsed = JSON.parse(json);
      // Validate that the saved data has the expected shape
      if (parsed && parsed.uid && parsed._isOffline === true) {
        return parsed as OfflineUser;
      }
      return null;
    } catch {
      // Corrupted data — clean it up
      await AsyncStorage.removeItem(OFFLINE_USER_KEY).catch(() => {});
      return null;
    }
  },

  /**
   * Delete the offline user from AsyncStorage.
   * Called after successfully syncing to a real Firebase account.
   */
  clearOfflineUser: async (): Promise<void> => {
    await AsyncStorage.removeItem(OFFLINE_USER_KEY);
  },

  /**
   * Type guard: check if a user object is an offline-only user.
   * Use this to decide whether to show "Sync to cloud" prompts
   * or to skip Firebase operations.
   */
  isOfflineUser: (user: unknown): user is OfflineUser => {
    return (
      user !== null &&
      typeof user === 'object' &&
      '_isOffline' in (user as Record<string, unknown>) &&
      (user as OfflineUser)._isOffline === true
    );
  },

  // ─── Trip Caching ─────────────────────────────────────────────────────────
  // Saves trips to the device when Firestore is unreachable.
  // These are synced to Firebase when internet becomes available.

  /**
   * Save a trip to local storage (AsyncStorage).
   * Called when the user completes a trip while offline.
   * The trip is given a local ID and timestamped.
   */
  cacheTripLocally: async (trip: Omit<TripRecord, 'id'>): Promise<void> => {
    try {
      const existing = await offlineService.getCachedTrips();
      const newTrip: TripRecord = {
        ...trip,
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      existing.push(newTrip);
      await AsyncStorage.setItem(CACHED_TRIPS_KEY, JSON.stringify(existing));
    } catch (error) {
      console.warn('Failed to cache trip locally:', error);
    }
  },

  /**
   * Get all locally cached trips.
   * Returns an empty array if no trips are cached.
   */
  getCachedTrips: async (): Promise<TripRecord[]> => {
    try {
      const json = await AsyncStorage.getItem(CACHED_TRIPS_KEY);
      if (!json) return [];
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Upload all locally cached trips to Firestore, then clear the local cache.
   * Called during sync when internet becomes available.
   *
   * @param firebaseUid - The real Firebase UID to save trips under
   * @param uploadFn - The Firestore upload function (injected to avoid circular deps)
   * @returns The number of trips synced
   */
  syncCachedTrips: async (
    firebaseUid: string,
    uploadFn: (uid: string, trip: Omit<TripRecord, 'id'>) => Promise<void>
  ): Promise<number> => {
    const cached = await offlineService.getCachedTrips();
    if (cached.length === 0) return 0;

    let syncedCount = 0;
    for (const trip of cached) {
      try {
        // Strip the local 'id' field before uploading — Firestore will generate its own
        const { id, ...tripData } = trip;
        await uploadFn(firebaseUid, tripData);
        syncedCount++;
      } catch (error) {
        // If one trip fails, continue with the rest
        console.warn('Failed to sync trip:', error);
      }
    }

    // Only clear cache if ALL trips synced successfully
    if (syncedCount === cached.length) {
      await offlineService.clearCachedTrips();
    } else {
      // Remove only the successfully synced trips, keep failed ones
      const remaining = cached.slice(syncedCount);
      await AsyncStorage.setItem(CACHED_TRIPS_KEY, JSON.stringify(remaining));
    }

    return syncedCount;
  },

  /**
   * Clear all locally cached trips.
   * Called after a successful full sync to Firebase.
   */
  clearCachedTrips: async (): Promise<void> => {
    await AsyncStorage.removeItem(CACHED_TRIPS_KEY);
  },

  /**
   * Clear ALL offline data (user + trips).
   * Called when the user logs out or deletes their account.
   */
  clearAllOfflineData: async (): Promise<void> => {
    await Promise.all([
      AsyncStorage.removeItem(OFFLINE_USER_KEY),
      AsyncStorage.removeItem(CACHED_TRIPS_KEY),
    ]);
  },
};
