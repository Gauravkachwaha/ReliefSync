import React from "react";
import { Link } from "react-router-dom";
import { Activity, LogOut, ShieldCheck } from "lucide-react";

export function Brand({ to = "/" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 shrink-0">
      <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
        <Activity size={17} className="text-white" />
      </div>
      <div className="leading-tight">
        <div className="font-display font-semibold text-[1.05rem]">
          ReliefSync <span className="text-accent">AI</span>
        </div>
        <div className="text-[0.6rem] uppercase tracking-widest text-text-dim font-semibold">
          Emergency Response Network
        </div>
      </div>
    </Link>
  );
}

export function AppTopbar({ user, onLogout, roleLabel }) {
  return (
    <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 border-b border-border bg-canvas/85 backdrop-blur-xl">
      <Brand />
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary border-r border-border pr-4">
          <ShieldCheck size={14} className="text-accent" />
          <span className="font-semibold text-text">{user?.name || user?.email}</span>
          <span className="text-text-dim text-xs">({roleLabel})</span>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
          title="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export default AppTopbar;
