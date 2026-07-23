import React from "react";
import { Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

export function EmptyState({ icon: Icon = Inbox, title, message }) {
  return (
    <div className="glass border-dashed text-center py-14 px-6">
      <Icon className="mx-auto mb-4 text-text-dim opacity-40" size={40} />
      <h3 className="text-text-secondary font-semibold text-base mb-1">{title}</h3>
      {message && <p className="text-text-dim text-sm max-w-sm mx-auto">{message}</p>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="glass border-danger/20 text-center py-14 px-6">
      <AlertTriangle className="mx-auto mb-4 text-danger opacity-70" size={36} />
      <h3 className="text-text font-semibold text-base mb-1">{title}</h3>
      {message && <p className="text-text-dim text-sm max-w-sm mx-auto mb-4">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mx-auto">
          <RefreshCw size={13} /> Retry
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
