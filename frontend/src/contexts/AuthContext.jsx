import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, register as registerRequest, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('banking_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('banking_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const login = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginRequest(values);
      setAuthToken(response.data.token);
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem('banking_token', response.data.token);
      localStorage.setItem('banking_user', JSON.stringify(response.data.user));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const response = await registerRequest(values);
      setAuthToken(response.data.token);
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem('banking_token', response.data.token);
      localStorage.setItem('banking_user', JSON.stringify(response.data.user));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await import('../services/api').then(m => m.default.post('/auth/logout'));
    } catch (err) {
      // Ignore errors — we still clear local state
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('banking_token');
    localStorage.removeItem('banking_user');
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
