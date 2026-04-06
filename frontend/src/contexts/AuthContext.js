import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
    if (tokens?.access && !user) {
      api.get('/auth/profile/')
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        })
        .catch(() => {
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('tokens', JSON.stringify({
      access: data.access,
      refresh: data.refresh,
    }));
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (values) => {
    const { data } = await api.post('/auth/register/', values);
    localStorage.setItem('tokens', JSON.stringify({
      access: data.access,
      refresh: data.refresh,
    }));
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
    try {
      if (tokens?.refresh) {
        await api.post('/auth/logout/', { refresh: tokens.refresh });
      }
    } catch { /* ignore */ }
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get('/auth/profile/');
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
  }, []);

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshProfile, isAdmin, isCustomer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
