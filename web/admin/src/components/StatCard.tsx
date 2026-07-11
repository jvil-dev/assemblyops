/**
 * Stat Card
 *
 * Compact metric display card with label, large value, optional
 * subtext, and an optional status dot (ok/warn/error).
 *
 * Props:
 *   - label: Metric name
 *   - value: Display value (string or number)
 *   - subtext: Secondary detail text
 *   - status: Optional 'ok' | 'warn' | 'error' indicator dot
 *
 * Used by: Overview, Infrastructure pages
 */
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  status?: 'ok' | 'warn' | 'error';
}

export function StatCard({ label, value, subtext, status }: StatCardProps) {
  const statusColor = status === 'ok'
    ? 'var(--status-ok)'
    : status === 'warn'
    ? 'var(--status-warn)'
    : status === 'error'
    ? 'var(--status-error)'
    : null;

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--divider)',
        padding: '20px',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {statusColor && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {subtext && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{subtext}</p>}
    </div>
  );
}
