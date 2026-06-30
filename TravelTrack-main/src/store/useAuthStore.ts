import { create } from 'zustand';

interface AuthState {
  user: any | null;       
  isLoading: boolean;    
  isLoggedIn: boolean;   
  error: string | null;   

  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isLoggedIn: false,
  error: null,

  initialize: () => {
    set({ isLoading: false, isLoggedIn: false });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      set({ user: { email, displayName: email.split('@')[0] }, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      // Mock register
      set({ user: { email, displayName: name }, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ user: { uid: 'guest-id', displayName: 'Guest Traveler' }, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: async () => {
    set({ user: null, isLoggedIn: false });
  },

  clearError: () => set({ error: null }),
}));
