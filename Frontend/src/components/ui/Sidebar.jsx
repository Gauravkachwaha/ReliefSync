import React from "react";
import { NavLink } from "react-router-dom";

export function Sidebar({ eyebrow, title, items }) {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-border bg-canvas px-4 py-7 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="px-2 mb-6">
        <div className="text-[0.65rem] font-bold uppercase tracking-widest text-text-dim">{eyebrow}</div>
        <div className="text-xl font-display font-bold">{title}</div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-text text-canvas shadow-sm font-semibold"
                  : "text-text-secondary hover:bg-black/5 hover:text-text",
              ].join(" ")
            }
          >
            <item.icon size={16} />
            <span className="flex-1">{item.label}</span>
            {item.count > 0 && (
              <span className="bg-danger text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {item.count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
