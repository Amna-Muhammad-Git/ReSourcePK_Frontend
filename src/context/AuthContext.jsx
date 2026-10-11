import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, setAccessToken, refreshSession } from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const data = await refreshSession();
      setAccessToken(data.accessToken);
      setContext(data.context);
      return data.context;
    } catch {
      setAccessToken(null);
      setContext(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    refreshSession()
      .then((data) => {
        if (!active) return;
        setAccessToken(data.accessToken);
        setContext(data.context);
      })
      .catch(() => {
        if (!active) return;
        setAccessToken(null);
        setContext(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const update = (event) => setContext(event.detail);
    window.addEventListener("resourcepk-session-context", update);
    return () =>
      window.removeEventListener("resourcepk-session-context", update);
  }, []);
  const login = useCallback(async (input) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAccessToken(data.accessToken);
    setContext(data.context);
    return data.context;
  }, []);
  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setContext(null);
    }
  }, []);
  const value = useMemo(
    () => ({ context, loading, login, logout, refresh }),
    [context, loading, login, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
