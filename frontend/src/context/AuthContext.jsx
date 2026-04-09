import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

async function registerPushSubscription() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const { data } = await api.get("/notifications/vapid-key");
    if (!data.publicKey) return;

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    });
    await api.post("/notifications/subscribe", { subscription });
  } catch (err) {
    console.warn("Push registration skipped:", err.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for active session cookie on mount
  useEffect(() => {
    localStorage.removeItem("vitap_connect_token"); // Clean up old tokens if they exist
    localStorage.removeItem("campus_connect_token");

    api.get("/users/me")
      .then(({ data }) => {
        setUser(data.user);
        registerPushSubscription();
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Listen for auto-logout events from the API interceptor
  useEffect(() => {
    function handleExpired() {
      setUser(null);
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  async function login(payload) {
    const { data } = await api.post("/auth/login", payload);
    setUser(data.user);
    registerPushSubscription();
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    if (data.user) {
      setUser(data.user);
      registerPushSubscription();
    }
    return data;
  }

  async function logout() {
    api.delete("/notifications/unsubscribe").catch(() => {});
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  }

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
