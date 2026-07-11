/**
 * Data Table
 *
 * Generic typed table component with column definitions, custom
 * cell renderers, hover highlights, and optional CSV export.
 *
 * Props:
 *   - columns: Column definitions with key, label, optional render/align
 *   - rows: Data array
 *   - emptyMessage: Placeholder when no rows
 *   - exportFileName: Enables CSV export button when set
 *
 * Used by: Events, Users, Metrics, Import pages
 */
'use client';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  exportFileName?: string;
}

function exportCSV<T>(columns: Column<T>[], rows: T[], fileName: string) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(row =>
    columns.map(col => {
      const val = String(row[col.key as keyof T] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({ columns, rows, emptyMessage = 'No data', exportFileName }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      {exportFileName && rows.length > 0 && (
        <div className="flex justify-end px-4 py-2">
          <button
            onClick={() => exportCSV(columns, rows, exportFileName)}
            className="transition-opacity hover:opacity-80"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-btn)',
              backgroundColor: 'var(--card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--divider)',
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={`py-3 px-4 text-xs font-semibold uppercase tracking-wide ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                style={{ color: 'var(--text-tertiary)' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="transition-colors"
                style={{ borderBottom: '1px solid var(--divider)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-secondary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
              >
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
