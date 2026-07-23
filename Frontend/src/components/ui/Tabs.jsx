import React from "react";

export function Tabs({ value, onChange, options, counts = {} }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-pill bg-black/5 border border-border">
      {options.map((opt) => {
        const active = opt.value === value;
        const count = counts[opt.value];
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "px-4 py-1.5 rounded-pill text-sm font-semibold transition-colors flex items-center gap-1.5",
              active
                ? "bg-text text-canvas shadow-sm"
                : "text-text-secondary hover:text-text",
            ].join(" ")}
          >
            {opt.label}
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? "bg-white/25" : "bg-black/10 text-text-dim"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
