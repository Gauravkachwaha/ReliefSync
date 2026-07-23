import React from "react";

const VARIANTS = {
  primary:
    "bg-text text-canvas shadow-sm hover:bg-black hover:-translate-y-px hover:shadow-md",
  accent:
    "bg-primary text-white shadow-sm hover:bg-primary-600 hover:-translate-y-px hover:shadow-md",
  secondary:
    "bg-surface border border-border text-text hover:border-border-hover hover:bg-surface-input",
  ghost: "bg-transparent text-text-secondary hover:bg-black/5 hover:text-text",
  danger:
    "bg-danger-bg border border-danger/25 text-danger hover:bg-danger/15",
  success:
    "bg-success-bg border border-success/25 text-success hover:bg-success/15",
};

const SIZES = {
  sm: "text-xs px-3.5 py-1.5 gap-1.5 rounded-pill",
  md: "text-sm px-5 py-2.5 gap-2 rounded-pill",
  icon: "p-2 rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150",
        "disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        full ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
