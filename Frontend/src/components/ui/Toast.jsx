import React from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TONE = {
  success: "border-success/30 text-success",
  error: "border-danger/30 text-danger",
  warning: "border-warning/30 text-warning",
  info: "border-info/30 text-info",
};

export function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 w-full max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`glass border ${TONE[t.type] || TONE.info} p-4 flex items-start gap-3 animate-fade-up shadow-xl`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-semibold text-sm text-text">{t.title}</div>}
              {t.message && <div className="text-xs text-text-secondary mt-0.5">{t.message}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-text-dim hover:text-text shrink-0">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastViewport;
