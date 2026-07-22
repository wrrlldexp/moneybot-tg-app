import { create } from "zustand";

interface User {
  id: number;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string;
  last_name: string | null;
  is_admin: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const STORAGE_KEY = "moneybot_access_token";

function loadPersistedToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: loadPersistedToken(),
  refreshToken: null,
  user: null,
  isAuthenticated: !!loadPersistedToken(),
  setAuth: (accessToken, refreshToken, user) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, accessToken);
    } catch {
      // sessionStorage may be unavailable in some contexts
    }
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },
  logout: () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },
}));
