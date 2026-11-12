import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { AuthTokenResponse, UserMeResponse } from '../api/types';

interface AuthContextType {
  user: UserMeResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokenResponse) => Promise<void>;
  updateAccessToken: (newToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('staybook_access_token')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('staybook_refresh_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMe = async () => {
    try {
      const res = await userApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch user info', err);
      // 토큰이 유효하지 않을 수 있음
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchMe().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [accessToken]);

  const login = async (tokens: AuthTokenResponse) => {
    localStorage.setItem('staybook_access_token', tokens.accessToken);
    localStorage.setItem('staybook_refresh_token', tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    await fetchMe();
  };

  const updateAccessToken = async (newToken: string) => {
    localStorage.setItem('staybook_access_token', newToken);
    setAccessToken(newToken);
    await fetchMe();
  };

  const logout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        console.warn('Logout API failed or already invalidated', err);
      }
    }
    localStorage.removeItem('staybook_access_token');
    localStorage.removeItem('staybook_refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const refreshTokens = async () => {
    if (!refreshToken) throw new Error('No refresh token available');
    const res = await authApi.refresh(refreshToken);
    if (res.success && res.data) {
      await login(res.data);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoggedIn: !!accessToken,
        isLoading,
        login,
        updateAccessToken,
        logout,
        refreshTokens,
        fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
