import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AlertTriangle, Search, Users, LogIn } from "lucide-react";
import { Brand } from "../components/ui";
import { useAuth, ROLE_HOME } from "../context/AuthContext";

const navLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-1.5 px-3.5 py-2 rounded-pill text-sm font-semibold transition-colors",
    isActive ? "bg-black/5 text-text" : "text-text-secondary hover:text-text hover:bg-black/5",
  ].join(" ");

export default function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 border-b border-border bg-canvas/85 backdrop-blur-xl">
        <Brand />
        <nav className="flex items-center gap-1">
          <NavLink to="/report" className={navLinkClass}>
            <AlertTriangle size={14} /> <span className="hidden sm:inline">Report</span>
          </NavLink>
          <NavLink to="/track" className={navLinkClass}>
            <Search size={14} /> <span className="hidden sm:inline">Track</span>
          </NavLink>
          <NavLink to="/ngos" className={navLinkClass}>
            <Users size={14} /> <span className="hidden sm:inline">NGOs</span>
          </NavLink>
          <NavLink
            to={user ? ROLE_HOME[user.role] || "/" : "/login"}
            className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-pill text-sm font-bold bg-text text-canvas shadow-sm hover:bg-black transition-colors"
          >
            <LogIn size={14} /> {user ? "Dashboard" : "Login"}
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="py-8 border-t border-border text-center text-xs text-text-dim">
        <p>&copy; {new Date().getFullYear()} ReliefSync AI Coordination Network. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-text-dim/70">
          Powering decentralized community emergency response with real-time AI classification triage.
        </p>
      </footer>
    </div>
  );
}
