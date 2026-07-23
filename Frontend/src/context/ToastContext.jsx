import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ToastViewport } from "../components/ui/Toast";

const ToastContext = createContext(null);
let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (type, title, message, duration = 4500) => {
      const id = ++idSeq;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (title, message) => push("success", title, message),
    error: (title, message) => push("error", title, message),
    warning: (title, message) => push("warning", title, message),
    info: (title, message) => push("info", title, message),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
