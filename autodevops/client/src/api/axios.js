// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Axios Instance
// ═══════════════════════════════════════════════════
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("deploynova_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("deploynova_token");
      localStorage.removeItem("deploynova_user");
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
