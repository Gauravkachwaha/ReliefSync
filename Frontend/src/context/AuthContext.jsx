import React, { createContext, useContext, useCallback, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.auth.getCurrentUser());

  const login = useCallback(async (email, password) => {
    const res = await api.auth.login(email, password);
    if (res.success) {
      const nextUser = api.auth.getCurrentUser();
      setUser(nextUser);
      return nextUser;
    }
    throw new Error(res.message || "Login failed");
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ROLE_HOME = {
  admin: "/ngo",
  volunteer: "/volunteer",
  super_admin: "/admin",
};

export const ROLE_LABEL = {
  admin: "NGO Admin",
  coordinator: "Coordinator",
  volunteer: "Volunteer",
  super_admin: "Super Admin",
};
