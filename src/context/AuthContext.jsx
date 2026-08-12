import { createContext, useCallback, useContext, useEffect, useState } from "react";
import API from "../api";
import { read, remove, STORAGE_KEYS } from "../utils/store";
import { AppError, getErrorMessage, isAuthError, logError, statusOf } from "../utils/errors";

function rethrow(context, error, fallback) {
  logError(context, error);
  throw new AppError(getErrorMessage(error, fallback), {
    status: statusOf(error),
    code: error?.code || null,
    cause: error,
  });
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bootstrap = useCallback(async () => {
    const token = read(STORAGE_KEYS.token);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await API.auth.getMe();
      setUser(res.user);
      setError("");
    } catch (e) {
      logError("Sessiya berpa olunmadi", e);
      // Yalniz autentifikasiya xetasinda sessiya silinir; sebeke xetasi
      // istifadecini sistemden cixarmamalidir.
      if (isAuthError(e)) {
        remove(STORAGE_KEYS.token);
        remove(STORAGE_KEYS.currentUser);
        setUser(null);
        setError("");
      } else {
        setUser(read(STORAGE_KEYS.currentUser));
        setError(getErrorMessage(e, "Sessiya yoxlanıla bilmədi."));
      }
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
      setError("");
      return res.user;
    } catch (e) {
      rethrow("Giris ugursuz oldu", e, "Giriş uğursuz oldu");
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      const res = await API.auth.register(data);
      setUser(res.user);
      setError("");
      return res.user;
    } catch (e) {
      rethrow("Qeydiyyat ugursuz oldu", e, "Qeydiyyat uğursuz oldu");
    }
  }, []);

  const logout = useCallback(() => {
    remove(STORAGE_KEYS.token);
    remove(STORAGE_KEYS.currentUser);
    setUser(null);
    setError("");
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const res = await API.auth.updateProfile(data);
      setUser(res.user);
      return res.user;
    } catch (e) {
      rethrow("Profil yenilenmedi", e, "Yenilenme uğursuz oldu");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, updateProfile }}
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
