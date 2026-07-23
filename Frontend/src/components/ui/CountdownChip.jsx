import React from "react";
import { Clock } from "lucide-react";
import { useCountdown } from "../../hooks/useCountdown";

export function CountdownChip({ expiresAt }) {
  const { expired, minutes, seconds } = useCountdown(expiresAt);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        expired ? "text-danger" : minutes < 5 ? "text-warning" : "text-text-dim"
      }`}
    >
      <Clock size={12} />
      {expired ? "Expired" : `${minutes}m ${String(seconds).padStart(2, "0")}s left`}
    </span>
  );
}

export default CountdownChip;
