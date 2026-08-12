import { createContext, useCallback, useContext, useEffect, useState } from "react";
import API from "../api";
import { read, remove, STORAGE_KEYS } from "../utils/store";

function clearStoredAuth() {
  remove(STORAGE_KEYS.token);
  remove(STORAGE_KEYS.currentUser);
}

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
    } catch {
      clearStoredAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const runAuth = useCallback(async (request, fallbackMessage) => {
    try {
      const res = await request();
      setUser(res.user);
      return res.user;
    } catch (e) {
      throw new Error(e.response?.data?.message || e.message || fallbackMessage);
    }
  }, []);

  const login = useCallback(
    (email, password) =>
      runAuth(() => API.auth.login(email, password), "Giriş uğursuz oldu"),
    [runAuth]
  );

  const register = useCallback(
    (data) => runAuth(() => API.auth.register(data), "Qeydiyyat uğursuz oldu"),
    [runAuth]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    (data) =>
      runAuth(() => API.auth.updateProfile(data), "Yenilenme uğursuz oldu"),
    [runAuth]
  );

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
