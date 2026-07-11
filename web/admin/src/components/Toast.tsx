/**
 * Toast Notification System
 *
 * Context-based toast notifications with auto-dismiss (4s) and
 * manual dismiss. Supports success, error, and info types with
 * color-coded left border.
 *
 * Exports:
 *   - ToastProvider: Wrap in layout to enable toasts
 *   - useToast(): Returns { showToast(message, type?) }
 *
 * Used by: DashboardShell (provider), Import page (consumer)
 */
'use client';
import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const typeColors: Record<ToastType, string> = {
  success: 'var(--status-ok)',
  error: 'var(--status-error)',
  info: 'var(--primary)',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid var(--divider)',
              borderLeft: `4px solid ${typeColors[toast.type]}`,
              padding: '12px 16px',
              minWidth: 300,
              maxWidth: 420,
              animation: 'toast-enter 0.25s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <p className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-xs transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopToast: ToastContextValue = { showToast: () => {} };

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? noopToast;
}
