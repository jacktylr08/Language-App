import { create } from 'zustand';
import { AuthState, getAuth, setAuth, clearAuth as clearAuthStorage } from './auth';

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
  clearError: () => void;
}

export const useAuth = create<AuthStore>((set) => {
  // Initialize from localStorage
  const storedAuth = getAuth();
  if (storedAuth) {
    set({
      user: storedAuth.user,
      accessToken: storedAuth.accessToken,
    });
  }

  return {
    user: storedAuth?.user || null,
    accessToken: storedAuth?.accessToken || null,
    isLoading: false,
    error: null,

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
