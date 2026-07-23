import React from "react";

const inputBase =
  "w-full rounded-lg border border-border bg-surface-input px-3.5 py-2.5 text-sm text-text placeholder:text-text-dim transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Label({ children }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-text-secondary mb-1.5">
      {children}
    </label>
  );
}

export function FieldGroup({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <span className="text-[11px] text-text-dim">{hint}</span>}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}

export function Input({ icon: Icon, className = "", ...props }) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input className={`${inputBase} pl-9 ${className}`} {...props} />
      </div>
    );
  }
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }) {
  return <textarea className={`${inputBase} resize-y min-h-[100px] ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${inputBase} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}

export default Input;
