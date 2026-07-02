import React from "react";
import { LogOut, Home, User, Shield, Activity } from "lucide-react";

/* ─── Spinner ─── */
export function Spinner({ size = "md" }) {
  const cls = `spinner spinner-${size}`;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
      <div className={cls} />
    </div>
  );
}

/* ─── Card ─── */
export function Card({ children, title, subtitle, className = "", hoverable = false, hover = false, onClick, style }) {
  const canHover = hoverable || hover;
  return (
    <div
      onClick={onClick}
      className={`glass ${canHover ? "hoverable" : ""} ${onClick ? "pointer" : ""} ${className}`}
      style={{ padding: "22px 24px", ...style }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: 14 }}>
          {title && <h3 style={{ fontSize: "1.1rem", color: "var(--text)" }}>{title}</h3>}
          {subtitle && <p className="text-sm text-secondary" style={{ marginTop: 4 }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Badge ─── */
export function Badge({ status, label }) {
  const raw = String(status || "").toUpperCase();
  const displayLabel = label || raw.replace(/_/g, " ");

  let type = "medium";
  if (["CRITICAL","BLOCKED","REJECTED","EXPIRED","CANCELLED"].includes(raw)) type = "critical";
  else if (["HIGH","PENDING","REVIEW_REQUIRED","NEEDS_CLARIFICATION","DUPLICATE","BUSY"].includes(raw)) type = "high";
  else if (["SUCCESS","ACCEPTED","NGO_ACCEPTED","FULLY_ASSIGNED","RESOLVED","AVAILABLE","COMPLETED"].includes(raw)) type = "success";
  else if (["LOW","OFF_DUTY"].includes(raw)) type = "low";

  return <span className={`badge badge-${type}`}>{displayLabel}</span>;
}

/* ─── Modal ─── */
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: "1.25rem" }}>{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Navbar ─── */
export function Navbar({ user, onLogout, currentView, onViewChange }) {
  return (
    <header className="navbar">
      <div className="navbar-brand" onClick={() => onViewChange("public")}>
        <div className="navbar-logo">
          <Activity size={18} />
        </div>
        <div>
          <div className="navbar-title">
            ReliefSync <span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <div className="navbar-tag">Emergency Response Network</div>
        </div>
      </div>

      <nav className="navbar-nav">
        <button
          onClick={() => onViewChange("public")}
          className={`btn btn-sm ${currentView === "public" ? "btn-primary" : "btn-secondary"}`}
        >
          <Home size={14} /> Public
        </button>

        {!user ? (
          <button
            onClick={() => onViewChange("login")}
            className={`btn btn-sm ${currentView === "login" ? "btn-accent" : "btn-secondary"}`}
          >
            <User size={14} /> Login
          </button>
        ) : (
          <>
            <span className="navbar-user">
              <Shield size={13} style={{ color: "var(--accent)" }} />
              {user.name || user.email}
              <span className="text-dim">({user.role})</span>
            </span>

            {user.role === "admin" && (
              <button
                onClick={() => onViewChange("ngo")}
                className={`btn btn-sm ${currentView === "ngo" ? "btn-primary" : "btn-secondary"}`}
              >
                Dashboard
              </button>
            )}
            {user.role === "volunteer" && (
              <button
                onClick={() => onViewChange("volunteer")}
                className={`btn btn-sm ${currentView === "volunteer" ? "btn-primary" : "btn-secondary"}`}
              >
                My Portal
              </button>
            )}
            {user.role === "super_admin" && (
              <button
                onClick={() => onViewChange("super-admin")}
                className={`btn btn-sm ${currentView === "super-admin" ? "btn-primary" : "btn-secondary"}`}
              >
                Admin Console
              </button>
            )}

            <button onClick={onLogout} className="btn btn-sm btn-secondary" style={{ color: "var(--danger)" }}>
              <LogOut size={14} />
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
