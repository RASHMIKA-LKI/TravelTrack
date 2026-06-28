// src/services/firestoreService.ts
import { TripRecord } from '../types/models';

export const firestoreService = {
  getTripHistory: async (uid: string): Promise<TripRecord[]> => {
    // Return empty history, screens fall back to mock data
    return [];
  }
};
