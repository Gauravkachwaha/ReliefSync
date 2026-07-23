import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, ROLE_HOME } from "../context/AuthContext";

export function RequireRole({ role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role] || "/"} replace />;

  return <Outlet />;
}

export default RequireRole;
