import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setClientToken } from '../api/client';
import type { User } from '../api/client';

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      fetchProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async (activeToken: string) => {
    setIsLoading(true);
    try {
      setClientToken(activeToken);
      const profile = await apiClient.auth.getMe();
      setUser(profile);
      setToken(activeToken);
    } catch (error) {
      console.error("Failed to fetch profile during auth", error);
      // Clean up on failure — token likely expired
      localStorage.removeItem('auth_token');
      setClientToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    await fetchProfile(newToken);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setClientToken(null);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const profile = await apiClient.auth.getMe();
        setUser(profile);
      } catch (error) {
        console.error("Failed to refresh user profile", error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
