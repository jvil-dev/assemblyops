/**
 * Error Card
 *
 * Styled error message card with a red status dot, customizable
 * title/message, and an optional retry button.
 *
 * Props:
 *   - title: Error heading (default: "Something went wrong")
 *   - message: Error detail text
 *   - onRetry: Optional callback to retry the failed operation
 *
 * Used by: All dashboard pages for query error states
 */
'use client';

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorCard({ title = 'Something went wrong', message, onRetry }: ErrorCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        padding: '24px',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0"
          style={{
            width: 10,
            height: 10,
            marginTop: 4,
            borderRadius: '50%',
            backgroundColor: 'var(--status-error)',
          }}
        />
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {title}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-btn)',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
