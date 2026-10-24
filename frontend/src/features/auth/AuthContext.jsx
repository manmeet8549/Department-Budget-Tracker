import { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, logoutApi, refreshApi } from './api.js';
import { setTokenGetter } from '../../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);

  // Attempt initial token refresh from httpOnly cookie on app load
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      try {
        const res = await refreshApi();
        if (mounted && res?.success && res.data) {
          setToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch {
        // Not logged in or expired cookie
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials) => {
    const res = await loginApi(credentials);
    if (res?.success && res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error('Login failed');
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(user && token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
