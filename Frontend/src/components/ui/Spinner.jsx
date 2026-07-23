import React from "react";

const SIZES = { sm: "h-4 w-4 border-2", md: "h-8 w-8 border-[3px]", lg: "h-12 w-12 border-4" };

export function Spinner({ size = "md", className = "" }) {
  return (
    <div className={`flex justify-center py-4 ${className}`}>
      <div
        className={`${SIZES[size]} rounded-full border-border border-t-primary animate-spin`}
      />
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-black/5 ${className}`} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="glass p-6 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

export default Spinner;
