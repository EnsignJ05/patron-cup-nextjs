'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const login = async (username: string, password: string) => {
    // Check against environment variables
    const adminUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    const userUsername = process.env.NEXT_PUBLIC_USER_USERNAME;
    const userPassword = process.env.NEXT_PUBLIC_USER_PASSWORD;

    // Check for admin login
    if (username === adminUsername && password === adminPassword) {
      setIsAuthenticated(true);
      setIsAdmin(true);
      return true;
    }

    // Check for regular user login
    if (username === userUsername && password === userPassword) {
      setIsAuthenticated(true);
      setIsAdmin(false);
      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, logout }}>
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