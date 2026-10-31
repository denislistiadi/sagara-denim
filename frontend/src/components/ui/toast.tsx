"use client";

import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiClose,
  mdiInformationOutline,
} from "@mdi/js";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICONS = {
  success: mdiCheckCircleOutline,
  error: mdiAlertCircleOutline,
  info: mdiInformationOutline,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "success" }: ToastInput) => {
      const id = ++counter.current;
      setToasts((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="ds-toast-viewport"
        role="region"
        aria-label="Notifikasi"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn("ds-toast", `ds-toast-${item.variant}`)}
            role="status"
          >
            <span className="ds-toast-icon">
              <Icon
                path={TOAST_ICONS[item.variant ?? "success"]}
                size={19}
              />
            </span>
            <div className="ds-toast-body">
              <div className="ds-toast-title">{item.title}</div>
              {item.description && (
                <div className="ds-toast-description">{item.description}</div>
              )}
            </div>
            <button
              type="button"
              className="ds-toast-close"
              onClick={() => remove(item.id)}
              aria-label="Tutup notifikasi"
            >
              <Icon path={mdiClose} size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }

  return context;
}
