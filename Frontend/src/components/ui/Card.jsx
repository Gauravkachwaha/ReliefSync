import React from "react";

export function Card({ title, subtitle, action, className = "", hover = false, onClick, children }) {
  return (
    <div
      onClick={onClick}
      className={[
        "glass p-6",
        hover ? "glass-hover cursor-pointer" : "",
        className,
      ].join(" ")}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-text">{title}</h3>}
            {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "primary" }) {
  const toneClasses = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };
  return (
    <div className="glass p-5 relative overflow-hidden">
      {Icon && (
        <Icon className={`absolute right-4 top-4 opacity-10 ${toneClasses[tone]}`} size={44} />
      )}
      <div className="text-[0.7rem] font-bold uppercase tracking-wider text-text-dim mb-1.5">
        {label}
      </div>
      <div className="font-display text-4xl font-semibold leading-none">{value}</div>
    </div>
  );
}

export default Card;
