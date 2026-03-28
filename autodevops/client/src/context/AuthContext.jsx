import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("deploynova_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem("deploynova_token");
          localStorage.removeItem("deploynova_user");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (tokenValue, userData) => {
    localStorage.setItem("deploynova_token", tokenValue);
    localStorage.setItem("deploynova_user", JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("deploynova_token");
    localStorage.removeItem("deploynova_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!token && !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
