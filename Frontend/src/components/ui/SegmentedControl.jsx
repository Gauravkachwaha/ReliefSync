import React from "react";

export function SegmentedControl({ value, onChange, options, className = "" }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-pill text-xs font-semibold border transition-all",
              active
                ? "bg-text border-transparent text-canvas shadow-sm"
                : "bg-surface border-border text-text-secondary hover:border-border-hover hover:text-text",
            ].join(" ")}
          >
            {Icon && <Icon size={13} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
