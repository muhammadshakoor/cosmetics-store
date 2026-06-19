'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

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
  login: (userData: User, remember?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const login = (userData: User, remember = true) => {
    setUser(userData);
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
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
