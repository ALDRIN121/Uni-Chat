'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginRequest, RegisterRequest, LLMConfig } from '@/lib/types';
import { apiService } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasLLMConfig: boolean;
  defaultLLMConfig: LLMConfig | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<User>;
  logout: () => void;
  checkLLMConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLLMConfig, setHasLLMConfig] = useState(false);
  const [defaultLLMConfig, setDefaultLLMConfig] = useState<LLMConfig | null>(null);

  const isAuthenticated = !!user;

  const checkLLMConfig = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const configStatus = await apiService.checkUserHasLLMConfig();
      setHasLLMConfig(configStatus.has_config);
      setDefaultLLMConfig(configStatus.default_config || null);
    } catch (error) {
      setHasLLMConfig(false);
      setDefaultLLMConfig(null);

      // If it's an auth error, clear the invalid token
      if (error instanceof Error && error.message.includes('Authentication required')) {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    }
  };

  // Separate effect to check LLM config when user becomes authenticated
  useEffect(() => {
    const checkLLMConfigOnAuth = async () => {
      if (isAuthenticated) {
        try {
          const configStatus = await apiService.checkUserHasLLMConfig();
          setHasLLMConfig(configStatus.has_config);
          setDefaultLLMConfig(configStatus.default_config || null);
        } catch (error) {
          setHasLLMConfig(false);
          setDefaultLLMConfig(null);

          // If it's an auth error, clear the invalid token
          if (error instanceof Error && error.message.includes('Authentication required')) {
            localStorage.removeItem('access_token');
            setUser(null);
          }
        }
      }
    };

    checkLLMConfigOnAuth();
  }, [isAuthenticated]);

  useEffect(() => {
    // Check if user is already logged in on app start
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);
          // LLM config will be checked by the separate useEffect above
        } catch {
          // Invalid/expired token - clear it and log the user out
          localStorage.removeItem('access_token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      await apiService.login(credentials);

      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);

      // Check LLM configuration after login
      await checkLLMConfig();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await apiService.register(userData);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setHasLLMConfig(false);
    setDefaultLLMConfig(null);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    hasLLMConfig,
    defaultLLMConfig,
    login,
    register,
    logout,
    checkLLMConfig,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
