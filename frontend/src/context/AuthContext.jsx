import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user_info');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize user profile on initial load if token exists
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          const profile = await authApi.getProfile();
          if (isMounted) {
            setUser(profile);
            localStorage.setItem('user_info', JSON.stringify(profile));
          }
        } catch (err) {
          // If token is invalid and cannot be refreshed, state will be cleared by interceptor
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for automatic logout events triggered by the Axios response interceptor
    const handleAutoLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:logout', handleAutoLogout);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:logout', handleAutoLogout);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setToken(data.access);

    const profile = await authApi.getProfile();
    setUser(profile);
    localStorage.setItem('user_info', JSON.stringify(profile));
    return profile;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authApi.register(formData);
    return res;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore network or token errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      setUser(null);
      setToken(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isOwner: user?.user_type === 'owner',
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
