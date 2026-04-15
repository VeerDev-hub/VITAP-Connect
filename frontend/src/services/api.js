import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || "http://localhost:5000"),
  withCredentials: true
});

// Auto-logout on 401 — expired or invalid token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes("/auth/");
      if (!isAuthRoute) {
        // Redirect to login without a full page reload if possible
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
    }
    return Promise.reject(error);
  }
);
