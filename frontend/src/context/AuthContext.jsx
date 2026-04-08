import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);
const tokenKey = "vitap_connect_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(tokenKey)));

  useEffect(() => {
    const oldToken = localStorage.getItem("campus_connect_token");
    if (oldToken && !localStorage.getItem(tokenKey)) {
      localStorage.setItem(tokenKey, oldToken);
      localStorage.removeItem("campus_connect_token");
    }

    const token = localStorage.getItem(tokenKey);
    if (!token) return;

    api.get("/users/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem(tokenKey))
      .finally(() => setLoading(false));
  }, []);

  async function login(payload) {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem(tokenKey, data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    if (data.token) {
      localStorage.setItem(tokenKey, data.token);
      setUser(data.user);
    }
    return data;
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setUser(null);
  }

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
