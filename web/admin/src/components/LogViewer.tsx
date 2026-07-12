/**
 * Log Viewer
 *
 * Terminal-style log event display with dark background, monospace font,
 * and color-coded rows for errors (red) and warnings (orange).
 * Shows timestamp, stream name, and message for each event.
 *
 * Props:
 *   - events: Array of { timestamp, message, logStreamName }
 *
 * Used by: Logs page
 */
interface LogEvent {
  timestamp: string | null;
  message: string;
  logStreamName: string;
}

export function LogViewer({ events }: { events: LogEvent[] }) {
  if (events.length === 0) {
    return (
      <div
        className="p-8 text-center font-mono text-sm"
        style={{ backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', color: '#64748b' }}
      >
        No log events found
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div className="overflow-auto max-h-[600px] text-xs">
        {events.map((e, i) => {
          const upper = e.message.toUpperCase();
          const isError = upper.includes('ERROR');
          const isWarn = upper.includes('WARN');
          return (
            <div
              key={i}
              className="flex gap-3 px-4 py-1.5"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                backgroundColor: isError ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: isError ? '#fca5a5' : isWarn ? '#fdba74' : '#cbd5e1',
              }}
            >
              <span className="shrink-0 w-20" style={{ color: '#475569' }}>
                {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—'}
              </span>
              <span className="shrink-0 truncate w-32" style={{ color: '#334155' }}>
                {e.logStreamName.split('/').pop()}
              </span>
              <span className="break-all leading-relaxed">{e.message.trim()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
