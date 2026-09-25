'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse } from '@/types';
import { api, ApiError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing session on boot
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('vault_token');
      const storedUser = localStorage.getItem('vault_user');

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);

      // If it's a demo session
      if (storedToken.startsWith('demo-session-') && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('vault_token');
          localStorage.removeItem('vault_user');
        }
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      try {
        const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
        if (response.success && response.data.user) {
          setUser(response.data.user);
        } else {
          throw new Error('Invalid user token response');
        }
      } catch (err) {
        console.warn('Session verification failed, clearing credentials:', err);
        localStorage.removeItem('vault_token');
        localStorage.removeItem('vault_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      if (response.success && response.data?.token) {
        const authToken = response.data.token;
        const authUser = response.data.user;

        localStorage.setItem('vault_token', authToken);
        localStorage.setItem('vault_user', JSON.stringify(authUser));

        setToken(authToken);
        setUser(authUser);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: any) {
      const msg = err.errors ? err.errors.join(', ') : err.message || 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/register', { name, email, password });
      if (response.success && response.data?.token) {
        const authToken = response.data.token;
        const authUser = response.data.user;

        localStorage.setItem('vault_token', authToken);
        localStorage.setItem('vault_user', JSON.stringify(authUser));

        setToken(authToken);
        setUser(authUser);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const msg = err.errors ? err.errors.join(', ') : err.message || 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = () => {
    const demoUser: User = {
      id: 'demo-operator-01',
      name: 'Site Reliability Engineer',
      email: 'operator@vault.internal',
      role: 'operator',
      createdAt: new Date().toISOString(),
    };
    const demoToken = `demo-session-${Date.now()}`;
    localStorage.setItem('vault_token', demoToken);
    localStorage.setItem('vault_user', JSON.stringify(demoUser));
    setToken(demoToken);
    setUser(demoUser);
    setError(null);
  };

  const logout = async () => {
    try {
      if (token && !token.startsWith('demo-session-')) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      localStorage.removeItem('vault_token');
      localStorage.removeItem('vault_user');
      setToken(null);
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        loginAsDemo,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
