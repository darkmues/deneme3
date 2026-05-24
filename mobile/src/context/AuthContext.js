// ============================================================
// HAYAT Mobile — Auth Context
// Global state: user, auth status, loading
// ============================================================
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // initial token check
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, user: action.user, isAuthenticated: true, isLoading: false, error: null };
    case 'AUTH_FAIL':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: action.error };
    case 'AUTH_LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.data } };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set auth error callback on API
  useEffect(() => {
    api.onAuthError = () => dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  // Check existing tokens on app start
  useEffect(() => {
    (async () => {
      try {
        await api.loadTokens();
        if (api.accessToken) {
          const res = await api.getProfile();
          dispatch({ type: 'AUTH_SUCCESS', user: res.data });
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (e) {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const data = await api.login(email, password);
      dispatch({ type: 'AUTH_SUCCESS', user: data.user });
      return data;
    } catch (error) {
      dispatch({ type: 'AUTH_FAIL', error: error.message });
      throw error;
    }
  }, []);

  const register = useCallback(async (email, password, fullName) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const data = await api.register(email, password, fullName);
      dispatch({ type: 'AUTH_SUCCESS', user: data.user });
      return data;
    } catch (error) {
      dispatch({ type: 'AUTH_FAIL', error: error.message });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  const updateUser = useCallback((data) => {
    dispatch({ type: 'UPDATE_USER', data });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside AuthProvider');
  return context;
};

export default AuthContext;
