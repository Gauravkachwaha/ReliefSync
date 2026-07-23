import React from "react";

const VARIANTS = {
  primary:
    "bg-gradient-to-br from-primary to-orange-500 text-white shadow-[0_2px_12px_hsl(263_85%_64%/30%)] hover:shadow-[0_4px_20px_hsl(263_85%_64%/40%)] hover:-translate-y-px",
  accent:
    "bg-gradient-to-br from-accent to-cyan-500 text-canvas font-bold hover:-translate-y-px",
  secondary:
    "bg-white/5 border border-border text-text hover:bg-white/10 hover:border-border-hover",
  ghost: "bg-transparent text-text-secondary hover:bg-white/5 hover:text-text",
  danger:
    "bg-danger-bg border border-danger/25 text-danger hover:bg-danger/20",
  success:
    "bg-success-bg border border-success/25 text-success hover:bg-success/20",
};

const SIZES = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-5 py-2.5 gap-2 rounded-xl",
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
        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
