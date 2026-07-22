import { create } from 'zustand';
import { AuthState, getAuth, setAuth, clearAuth as clearAuthStorage } from './auth';
import { clearLocalLearnerState } from './sync';
import { LAST_USER_ID_KEY } from './keys';

/**
 * Guards against a returning bug: signing into a DIFFERENT account on a
 * browser that still has a previous account's progress sitting in
 * localStorage. syncOnLoad's merge is additive (union) by design — it never
 * wipes anything — so without this check, the old account's local progress
 * would get permanently blended into the new account's server-side state the
 * first time it syncs. If the account switched, wipe local state first so
 * the new session starts clean and pulls only its own data.
 */
function guardAgainstAccountSwitch(userId: string): void {
  if (typeof window === 'undefined') return;
  const lastUserId = localStorage.getItem(LAST_USER_ID_KEY);
  if (lastUserId && lastUserId !== userId) {
    clearLocalLearnerState();
  }
  localStorage.setItem(LAST_USER_ID_KEY, userId);
}

interface User {
  id: string;
  email: string;
  currentLevel: number;
  locale?: string;
  preferences?: Record<string, unknown>;
  createdAt?: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  getCurrentUser: () => Promise<void>;
  hydrate: () => void;
  clearError: () => void;
}

export const useAuth = create<AuthStore>((set) => {
  return {
    // Start unauthenticated so the first client render matches the server
    // render (which has no localStorage). hydrate() fills this in after mount,
    // avoiding React hydration mismatches.
    user: null,
    accessToken: null,
    isLoading: true,
    error: null,

    hydrate: () => {
      const stored = getAuth();
      set({
        user: stored?.user || null,
        accessToken: stored?.accessToken || null,
        isLoading: false,
      });
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const { api } = await import('./api');
        const response = await api.post('/auth/login', { email, password });

        const auth: AuthState = {
          accessToken: response.data.tokens.accessToken,
          refreshToken: response.data.tokens.refreshToken,
          user: response.data.user,
        };

        guardAgainstAccountSwitch(response.data.user.id);
        setAuth(auth);
        set({
          user: response.data.user,
          accessToken: response.data.tokens.accessToken,
          isLoading: false,
        });
      } catch (error: any) {
        let message: string;
        if (error.response?.data?.error) {
          message = error.response.data.error;
        } else if (error.response) {
          message = `Server error (${error.response.status})`;
        } else if (error.request) {
          message = `Can't reach API. Check NEXT_PUBLIC_API_URL. (${error.message})`;
        } else {
          message = error.message || 'Login failed';
        }
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    register: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const { api } = await import('./api');
        const response = await api.post('/auth/register', { email, password });

        const auth: AuthState = {
          accessToken: response.data.tokens.accessToken,
          refreshToken: response.data.tokens.refreshToken,
          user: response.data.user,
        };

        guardAgainstAccountSwitch(response.data.user.id);
        setAuth(auth);
        set({
          user: response.data.user,
          accessToken: response.data.tokens.accessToken,
          isLoading: false,
        });
      } catch (error: any) {
        let message: string;
        if (error.response?.data?.error) {
          message = error.response.data.error;
        } else if (error.response) {
          message = `Server error (${error.response.status})`;
        } else if (error.request) {
          message = `Can't reach API. Check NEXT_PUBLIC_API_URL. (${error.message})`;
        } else {
          message = error.message || 'Registration failed';
        }
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    logout: () => {
      clearAuthStorage();
      clearLocalLearnerState();
      set({ user: null, accessToken: null });
    },

    setUser: (user: User | null) => {
      set({ user });
    },

    getCurrentUser: async () => {
      set({ isLoading: true });
      try {
        const { api } = await import('./api');
        const response = await api.get('/auth/me');
        set({ user: response.data, isLoading: false });
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    clearError: () => {
      set({ error: null });
    },
  };
});

// Store for app state
interface AppStore {
  currentLesson: any | null;
  setCurrentLesson: (lesson: any | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentLesson: null,
  setCurrentLesson: (lesson) => set({ currentLesson: lesson }),
}));
