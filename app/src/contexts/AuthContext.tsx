import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiRequest, setToken, getToken, API_URL } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'basic' | 'plus' | 'premium' | 'ultimate' | 'lifetime';
  hoursLeft: number;
  totalHoursBoosted: number;
  gamesCount: number;
  maxGames: number;
  isAdmin: boolean;
  steamConnected: boolean;
  steamId?: string | null;
  steamUsername?: string | null;
  steamAccountSlots?: number;
  steamAccounts?: Array<{ id: string; username: string; connected?: boolean; createdAt?: string }>;
  xp?: number;
  level?: number;
  isBanned?: boolean;
  bannedReason?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastDevice?: string | null;
  ipAddresses?: string[];
  loginHistory?: Array<{
    id: string;
    method: string;
    ip: string | null;
    userAgent: string | null;
    device: string;
    createdAt: string;
  }>;
  createdAt: string;
  settings?: {
    appearance: 'online' | 'away' | 'invisible';
    displayMode: 'normal' | 'compact';
    autoRestart: boolean;
    autoStop: boolean;
    hideActivity: boolean;
    autoFriend: boolean;
    cardFarmer: boolean;
    customTitleEnabled: boolean;
    customTitle: string;
    awayMessageEnabled: boolean;
    awayMessage: string;
  };
  games?: Array<{ id: string; appId: string; name: string; icon?: string }>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  connectSteam: (steamData: { steamId: string; username: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  openSteamLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  token: string;
  user: User;
}

function applyAuthFromUrl(): string | null {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('authToken');
  if (!token) return null;

  setToken(token);
  url.searchParams.delete('authToken');
  window.history.replaceState({}, '', url.toString());
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await apiRequest<{ user: User; token?: string }>('/auth/me');
      setUser(me.user);
      if (me.token) {
        setToken(me.token);
      }
    } catch {
      setUser(null);
      setToken(null);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        applyAuthFromUrl();
        const token = getToken();
        if (token) {
          await refreshUser();
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    const heartbeat = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const payload = await apiRequest<{ user: User }>('/account/presence', {
          method: 'POST',
        });
        if (!cancelled) {
          setUser(payload.user);
        }
      } catch {
        // Ignore background presence failures.
      }
    };

    const timer = window.setInterval(heartbeat, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken(payload.token);
      setUser(payload.user);
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const referralCode = localStorage.getItem('steamboost_referral_code') || '';
      const payload = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, referralCode }),
      });

      setToken(payload.token);
      setUser(payload.user);
      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network errors.
    } finally {
      setUser(null);
      setToken(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    const payload = await apiRequest<{ user: User }>('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    setUser(payload.user);
  };

  const connectSteam = async (steamData: { steamId: string; username: string }) => {
    void steamData;
    await refreshUser();
  };

  const openSteamLogin = () => {
    const token = getToken();
    const url = token
      ? `${API_URL}/auth/google?token=${encodeURIComponent(token)}`
      : `${API_URL}/auth/google`;

    window.location.href = url;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        connectSteam,
        refreshUser,
        openSteamLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
