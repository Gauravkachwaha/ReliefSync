import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, ROLE_HOME } from "../context/AuthContext";

export function RequireRole({ role, roles }) {
  const { user } = useAuth();
  const allowedRoles = roles || (role ? [role] : []);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || "/"} replace />;

  return <Outlet />;
}

export default RequireRole;
