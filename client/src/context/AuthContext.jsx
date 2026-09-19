import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api";
import { clearSnippetsCache } from "../utils/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("codepad_auth_token"));
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount or when token changes
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem("codepad_auth_token");
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.getMe();
      setUser(data);
    } catch (err) {
      console.warn("Session expired or invalid, logging out:", err.message);
      localStorage.removeItem("codepad_auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const res = await authApi.loginWithGoogle(credential);
      localStorage.setItem("codepad_auth_token", res.token);
      setToken(res.token);
      setUser(res.user);
      return { success: true, user: res.user };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const devLogin = async (userData = {}) => {
    setLoading(true);
    try {
      const res = await authApi.devLogin(userData);
      localStorage.setItem("codepad_auth_token", res.token);
      setToken(res.token);
      setUser(res.user);
      return { success: true, user: res.user };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("codepad_auth_token");
    clearSnippetsCache();
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    try {
      const updated = await authApi.updateProfile(data);
      setUser((prev) => ({ ...prev, ...updated }));
      return { success: true, user: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        loginWithGoogle,
        devLogin,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
