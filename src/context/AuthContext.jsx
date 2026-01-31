

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "@/services/api/authService";
import { clearTokens, getAccessToken } from "@/services/api/client";

/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */

const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      
      if (token) {
        try {
          // Verify token and get user data
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (err) {
          // Token invalid or expired
          clearTokens();
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (email, password, role) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password, role);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  /**
   * Clear auth error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Context value
  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
