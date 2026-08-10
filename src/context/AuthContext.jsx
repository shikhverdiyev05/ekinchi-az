import { createContext, useCallback, useContext, useEffect, useState } from "react";
import API from "../api";
import { read, write, remove, STORAGE_KEYS } from "../utils/store";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = read(STORAGE_KEYS.token);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await API.auth.getMe();
      setUser(res.user);
    } catch (e) {
      remove(STORAGE_KEYS.token);
      remove(STORAGE_KEYS.currentUser);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await API.auth.login(email, password);
      setUser(res.user);
      return res.user;
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Giriş uğursuz oldu";
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      const res = await API.auth.register(data);
      setUser(res.user);
      return res.user;
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Qeydiyyat uğursuz oldu";
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    remove(STORAGE_KEYS.token);
    remove(STORAGE_KEYS.currentUser);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const res = await API.auth.updateProfile(data);
      setUser(res.user);
      return res.user;
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Yenilenme uğursuz oldu";
      throw new Error(msg);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
