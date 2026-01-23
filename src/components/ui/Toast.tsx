"use client";

import { useEffect, useState, useCallback } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "error" | "success" | "info";
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto dismiss
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-ft-error" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    error: "bg-ft-error/10 border-ft-error/20",
    success: "bg-green-50 border-green-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg bg-white
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        ${bgColors[toast.type]}
      `}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-ft-gray-700">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="p-1 text-ft-gray-400 hover:text-ft-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage["type"], message: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback((message: string, duration?: number) => addToast("error", message, duration), [addToast]);
  const showSuccess = useCallback((message: string, duration?: number) => addToast("success", message, duration), [addToast]);
  const showInfo = useCallback((message: string, duration?: number) => addToast("info", message, duration), [addToast]);

  return {
    toasts,
    dismissToast,
    showError,
    showSuccess,
    showInfo,
  };
}
