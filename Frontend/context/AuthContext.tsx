'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  token: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  /** false until the stored session has been read on the client — guards must wait for it */
  authReady: boolean;
  login: (userData: User, remember?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Start as null on both server and client so the first client render matches the
  // server HTML (reading storage in the initializer caused hydration mismatches).
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem('userInfo');
      sessionStorage.removeItem('userInfo');
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (user) {
      document.cookie = 'lumina_auth=1; path=/; max-age=2592000; SameSite=Lax';
      if (user.isAdmin) {
        document.cookie = 'lumina_admin=1; path=/; max-age=2592000; SameSite=Lax';
      }
    }
  }, [user]);

  const login = (userData: User, remember = true) => {
    setUser(userData);
    const maxAge = remember ? 2592000 : 86400;
    if (typeof document !== 'undefined') {
      document.cookie = `lumina_auth=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      if (userData.isAdmin) {
        document.cookie = `lumina_admin=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      } else {
        document.cookie = 'lumina_admin=; path=/; max-age=0; SameSite=Lax';
      }
    }

    if (remember) {
      localStorage.setItem('userInfo', JSON.stringify(userData));
      sessionStorage.removeItem('userInfo');
    } else {
      sessionStorage.setItem('userInfo', JSON.stringify(userData));
      localStorage.removeItem('userInfo');
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof document !== 'undefined') {
      document.cookie = 'lumina_auth=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'lumina_admin=; path=/; max-age=0; SameSite=Lax';
    }
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
