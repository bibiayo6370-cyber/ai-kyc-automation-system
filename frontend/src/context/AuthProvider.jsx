import { useCallback, useEffect, useMemo, useState } from "react";
import AuthContext from "@/context/AuthContext";
import api from "@/lib/api";
import { clearStoredSession, getStoredToken, getStoredUser, storeSession } from "@/lib/authStorage";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);

    storeSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (!storedToken || !storedUser) {
        clearStoredSession();
        if (isActive) setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/profile", {
          logoutOnForbidden: true
        });

        if (!isActive) return;

        storeSession(storedToken, data.user);
        setToken(storedToken);
        setUser(data.user);
      } catch {
        if (isActive) clearSession();
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    function handleInvalidSession() {
      clearSession();
      setIsLoading(false);
    }

    window.addEventListener("auth:session-invalid", handleInvalidSession);
    restoreSession();

    return () => {
      isActive = false;
      window.removeEventListener("auth:session-invalid", handleInvalidSession);
    };
  }, [clearSession]);

  const value = useMemo(() => ({
    token,
    user,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    logout
  }), [token, user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}