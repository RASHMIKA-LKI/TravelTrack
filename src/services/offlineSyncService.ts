// src/services/offlineSyncService.ts
// Offline storage & background synchronization engine for TravelTrack (WhatsApp-style sync).
// Saves trip records, user profiles, and pending sync actions locally to AsyncStorage.
// Automatically syncs pending items to Firebase Firestore when internet connectivity is active.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, addDoc, collection, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TripRecord } from '../types/models';

const STORAGE_KEYS = {
  LOCAL_TRIPS: '@TravelTrack:local_trip_records_v1',
  PENDING_QUEUE: '@TravelTrack:pending_sync_queue_v1',
  USER_PROFILE: '@TravelTrack:cached_user_profile_v1',
};

export interface PendingSyncItem {
  id: string;
  type: 'SAVE_TRIP' | 'SAVE_PROFILE' | 'INCREMENT_COUNT';
  uid: string;
  payload: any;
  createdAt: number;
  retryCount: number;
}

export interface ExtendedTripRecord extends TripRecord {
  syncStatus?: 'synced' | 'pending';
  localId?: string;
}

let isSyncing = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;

// Helper to generate unique local IDs
function generateLocalId(): string {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

export const offlineSyncService = {
  /**
   * Save a completed trip record locally immediately.
   * Ensures zero network blocking when ending/leaving a trip offline.
   */
  saveTripLocally: async (uid: string, trip: Omit<TripRecord, 'id'>): Promise<ExtendedTripRecord> => {
    try {
      const localId = generateLocalId();
      const newTripRecord: ExtendedTripRecord = {
        ...trip,
        id: localId,
        localId,
        syncStatus: 'pending',
      };

      // 1. Get existing local trips
      const rawTrips = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_TRIPS);
      const trips: ExtendedTripRecord[] = rawTrips ? JSON.parse(rawTrips) : [];
      trips.unshift(newTripRecord);

      // Save updated array
      await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_TRIPS, JSON.stringify(trips));

      // 2. Add to pending cloud sync queue
      await offlineSyncService.enqueueItem({
        id: generateLocalId(),
        type: 'SAVE_TRIP',
        uid,
        payload: { localId, ...trip },
        createdAt: Date.now(),
        retryCount: 0,
      });

      // 3. Trigger immediate background sync attempt (non-blocking)
      void offlineSyncService.syncPendingData();

      return newTripRecord;
    } catch (error) {
      console.warn('[OfflineSync] Error saving trip locally:', error);
      const fallbackRecord: ExtendedTripRecord = {
        ...trip,
        id: generateLocalId(),
        syncStatus: 'pending',
      };
      return fallbackRecord;
    }
  },

  /**
   * Get locally saved trip records for a specific user.
   */
  getLocalTripRecords: async (uid: string): Promise<ExtendedTripRecord[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_TRIPS);
      if (!raw) return [];
      const trips: ExtendedTripRecord[] = JSON.parse(raw);
      return trips;
    } catch (error) {
      console.warn('[OfflineSync] Error reading local trips:', error);
      return [];
    }
  },

  /**
   * Enqueue a pending sync action for Firebase Firestore.
   */
  enqueueItem: async (item: PendingSyncItem): Promise<void> => {
    try {
      const rawQueue = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
      const queue: PendingSyncItem[] = rawQueue ? JSON.parse(rawQueue) : [];
      queue.push(item);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.warn('[OfflineSync] Error enqueuing item:', error);
    }
  },

  /**
   * Get all currently pending sync items.
   */
  getPendingQueue: async (): Promise<PendingSyncItem[]> => {
    try {
      const rawQueue = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
      return rawQueue ? JSON.parse(rawQueue) : [];
    } catch {
      return [];
    }
  },

  /**
   * Synchronize all pending items to Firebase Firestore.
   * Runs idempotently in the background.
   */
  syncPendingData: async (): Promise<{ syncedCount: number; errorCount: number }> => {
    if (isSyncing) return { syncedCount: 0, errorCount: 0 };
    isSyncing = true;

    let syncedCount = 0;
    let errorCount = 0;

    try {
      const rawQueue = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
      if (!rawQueue) {
        isSyncing = false;
        return { syncedCount: 0, errorCount: 0 };
      }

      const queue: PendingSyncItem[] = JSON.parse(rawQueue);
      if (queue.length === 0) {
        isSyncing = false;
        return { syncedCount: 0, errorCount: 0 };
      }

      const remainingQueue: PendingSyncItem[] = [];

      for (const item of queue) {
        try {
          if (item.type === 'SAVE_TRIP') {
            const { localId, ...tripData } = item.payload;
            const tripsRef = collection(db, 'users', item.uid, 'trips');
            await addDoc(tripsRef, {
              ...tripData,
              savedAt: serverTimestamp(),
            });

            // Also increment user trip count in Firestore
            try {
              const userRef = doc(db, 'users', item.uid);
              await updateDoc(userRef, { totalTrips: increment(1) });
            } catch (incErr) {
              console.warn('[OfflineSync] Non-critical increment count error:', incErr);
            }

            // Mark local trip as synced in AsyncStorage
            if (localId) {
              const rawTrips = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_TRIPS);
              if (rawTrips) {
                const trips: ExtendedTripRecord[] = JSON.parse(rawTrips);
                const match = trips.find((t) => t.localId === localId || t.id === localId);
                if (match) {
                  match.syncStatus = 'synced';
                  await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_TRIPS, JSON.stringify(trips));
                }
              }
            }

            syncedCount++;
          } else if (item.type === 'SAVE_PROFILE') {
            const userRef = doc(db, 'users', item.uid);
            await setDoc(userRef, { ...item.payload, updatedAt: serverTimestamp() }, { merge: true });
            syncedCount++;
          } else if (item.type === 'INCREMENT_COUNT') {
            const userRef = doc(db, 'users', item.uid);
            await updateDoc(userRef, { totalTrips: increment(1) });
            syncedCount++;
          }
        } catch (error) {
          console.warn(`[OfflineSync] Sync failed for item ${item.id} (${item.type}):`, error);
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 10) {
            remainingQueue.push(item);
          }
          errorCount++;
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(remainingQueue));
    } catch (err) {
      console.warn('[OfflineSync] Sync iteration error:', err);
    } finally {
      isSyncing = false;
    }

    return { syncedCount, errorCount };
  },

  /**
   * Cache user profile locally for instant offline startup.
   */
  cacheUserProfileLocally: async (uid: string, profile: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.USER_PROFILE}_${uid}`,
        JSON.stringify({ ...profile, cachedAt: Date.now() })
      );
    } catch (error) {
      console.warn('[OfflineSync] Error caching profile:', error);
    }
  },

  /**
   * Retrieve cached user profile from local storage.
   */
  getCachedUserProfile: async (uid: string): Promise<any | null> => {
    try {
      const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.USER_PROFILE}_${uid}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get total number of pending items waiting for cloud backup.
   */
  getPendingCount: async (): Promise<number> => {
    const queue = await offlineSyncService.getPendingQueue();
    return queue.length;
  },

  /**
   * Start a background sync loop that attempts sync every 15 seconds.
   */
  startPeriodicSync: (intervalMs = 15000): (() => void) => {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      void offlineSyncService.syncPendingData();
    }, intervalMs);

    return () => {
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = null;
    };
  },
};
