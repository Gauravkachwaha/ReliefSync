import React from "react";

const CRITICAL = ["CRITICAL", "BLOCKED", "REJECTED", "EXPIRED", "CANCELLED", "REJECTED_AS_SPAM"];
const HIGH = ["HIGH", "PENDING", "REVIEW_REQUIRED", "NEEDS_CLARIFICATION", "DUPLICATE", "BUSY", "OPEN"];
const SUCCESS = ["SUCCESS", "ACCEPTED", "NGO_ACCEPTED", "FULLY_ASSIGNED", "RESOLVED", "AVAILABLE", "COMPLETED", "VERIFIED"];
const LOW = ["LOW", "OFF_DUTY", "OFFLINE"];

const TONE_CLASSES = {
  critical: "bg-danger-bg text-danger border-danger/25",
  high: "bg-warning-bg text-warning border-warning/25",
  medium: "bg-info-bg text-info border-info/20",
  success: "bg-success-bg text-success border-success/25",
  low: "bg-black/5 text-text-dim border-border",
};

export default function Badge({ status, label, tone: toneOverride }) {
  const raw = String(status || "").toUpperCase();
  const displayLabel = label || raw.replace(/_/g, " ");

  let tone = toneOverride;
  if (!tone) {
    if (CRITICAL.includes(raw)) tone = "critical";
    else if (HIGH.includes(raw)) tone = "high";
    else if (SUCCESS.includes(raw)) tone = "success";
    else if (LOW.includes(raw)) tone = "low";
    else tone = "medium";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill border text-[0.68rem] font-bold uppercase tracking-wide whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {displayLabel}
    </span>
  );
}
