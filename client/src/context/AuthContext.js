import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const connectUser = useCallback((token) => {
    const s = connectSocket(token);
    setSocket(s);
    return s;
  }, []);

  const saveAuth = useCallback((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    connectUser(data.token);
  }, [connectUser]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await API.get('/auth/me');
          setUser(data);
          connectUser(token);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [connectUser]);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    saveAuth(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await API.post('/auth/register', { name, email, password });
    saveAuth(data);
    return data;
  };

  const googleLogin = async (credentialResponse) => {
    const { data } = await API.post('/auth/google', {
      credential: credentialResponse.credential,
    });
    saveAuth(data);
    return data;
  };

  const phoneLogin = async (firebaseToken) => {
    const { data } = await API.post('/auth/phone', { firebaseToken });
    saveAuth(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
    setSocket(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, socket, login, register, googleLogin, phoneLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
