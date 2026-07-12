/**
 * Import Page
 *
 * CSV file upload tool for bulk-importing congregations, events,
 * or volunteers. Includes drag-and-drop upload, preview table,
 * and import result summary with error details.
 *
 * Mutations: ImportCongregations, ImportEvents, ImportVolunteers
 * Queries: EventStats (for volunteer event selector)
 *
 * Dependencies: DashboardShell, DataTable, ErrorCard, Toast
 */
'use client';
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { DashboardShell } from '../../components/DashboardShell';
import { DataTable } from '../../components/DataTable';
import { ErrorCard } from '../../components/ErrorCard';
import { useToast } from '../../components/Toast';
import { EVENT_STATS, IMPORT_CONGREGATIONS, IMPORT_EVENTS, IMPORT_VOLUNTEERS } from '../../lib/queries';

type ImportTab = 'congregations' | 'events' | 'volunteers';

const TABS: { value: ImportTab; label: string }[] = [
  { value: 'congregations', label: 'Congregations' },
  { value: 'events', label: 'Events' },
  { value: 'volunteers', label: 'Volunteers' },
];

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  totalRows: number;
  errors: { row: number; field: string; message: string }[];
}

interface EventStat {
  eventId: string;
  name: string;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportTab>('congregations');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const { data: eventData } = useQuery<{ eventStats: EventStat[] }>(EVENT_STATS);

  const [importCongregations, { loading: loadingCong }] = useMutation<{ importCongregations: ImportResult }>(IMPORT_CONGREGATIONS);
  const [importEvents, { loading: loadingEv }] = useMutation<{ importEvents: ImportResult }>(IMPORT_EVENTS);
  const [importVolunteers, { loading: loadingVol }] = useMutation<{ importVolunteers: ImportResult }>(IMPORT_VOLUNTEERS);

  const isImporting = loadingCong || loadingEv || loadingVol;

  const handleFile = useCallback((file: File) => {
    setImportResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      const { headers, rows } = parseCSV(text);
      setPreviewHeaders(headers);
      setPreviewRows(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!csvContent) return;
    try {
      let result: ImportResult | undefined;
      if (activeTab === 'congregations') {
        const res = await importCongregations({ variables: { csvData: csvContent } });
        result = res.data?.importCongregations;
      } else if (activeTab === 'events') {
        const res = await importEvents({ variables: { csvData: csvContent } });
        result = res.data?.importEvents;
      } else {
        if (!selectedEventId) {
          showToast('Please select an event first', 'error');
          return;
        }
        const res = await importVolunteers({ variables: { eventId: selectedEventId, csvData: csvContent } });
        result = res.data?.importVolunteers;
      }
      if (result) {
        setImportResult(result);
        if (result.success) {
          showToast(`Import complete: ${result.created} created, ${result.updated} updated`, 'success');
        } else {
          showToast(`Import had issues: ${result.errors.length} error(s)`, 'error');
        }
      }
    } catch (err) {
      showToast(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleClear = () => {
    setCsvContent(null);
    setFileName(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--divider)',
    padding: '20px',
  };

  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Import Data</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Upload CSV files to import data</p>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); handleClear(); }}
              style={{
                backgroundColor: activeTab === tab.value ? 'var(--primary)' : 'var(--card)',
                color: activeTab === tab.value ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-btn)',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === tab.value ? 600 : 500,
                border: activeTab === tab.value ? 'none' : '1px solid var(--divider)',
                boxShadow: activeTab === tab.value ? 'none' : 'var(--shadow-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Selector (volunteers only) */}
        {activeTab === 'volunteers' && (
          <div style={cardStyle} className="mb-4">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Select Event</p>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              style={{
                height: 44,
                backgroundColor: 'var(--card)',
                border: '1px solid var(--divider)',
                borderRadius: 'var(--radius-btn)',
                padding: '0 14px',
                fontSize: '14px',
                color: selectedEventId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                width: '100%',
                outline: 'none',
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              <option value="">Choose an event...</option>
              {(eventData?.eventStats ?? []).map(ev => (
                <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* File Upload Zone */}
        {!csvContent && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...cardStyle,
              border: '2px dashed var(--divider)',
              textAlign: 'center',
              padding: '56px 20px',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary-tint)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--divider)')}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Drop a CSV file here or click to browse
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {activeTab === 'congregations' && 'Required headers: name, state, circuitCode'}
              {activeTab === 'events' && 'Required headers: eventType, region, serviceYear, name, venue, address, startDate, endDate'}
              {activeTab === 'volunteers' && 'Required headers: firstName, lastName, congregation'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* Preview */}
        {csvContent && !importResult && (
          <div style={cardStyle} className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Preview: {fileName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Showing {Math.min(10, previewRows.length)} of {previewRows.length} rows
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-btn)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--divider)',
                    boxShadow: 'var(--shadow-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-btn)',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: isImporting ? 'default' : 'pointer',
                    opacity: isImporting ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isImporting ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
            <DataTable
              columns={previewHeaders.map(h => ({ key: h, label: h }))}
              rows={previewRows.slice(0, 10)}
              emptyMessage="No data in CSV"
            />
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div style={cardStyle} className="mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: importResult.success ? 'var(--status-ok)' : 'var(--status-error)',
                }}
              />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Import {importResult.success ? 'Complete' : 'Had Issues'}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Created', value: importResult.created, color: 'var(--status-ok)' },
                { label: 'Updated', value: importResult.updated, color: 'var(--primary)' },
                { label: 'Skipped', value: importResult.skipped, color: 'var(--status-warn)' },
                { label: 'Total', value: importResult.totalRows, color: 'var(--text-primary)' },
              ].map(stat => (
                <div
                  key={stat.label}
                  style={{
                    backgroundColor: 'var(--card-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                  <p className="text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--status-error)' }}>
                  Errors ({importResult.errors.length})
                </p>
                <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--divider)' }}>
                  <DataTable
                    columns={[
                      { key: 'row', label: 'Row' },
                      { key: 'field', label: 'Field' },
                      { key: 'message', label: 'Message' },
                    ]}
                    rows={importResult.errors}
                    emptyMessage="No errors"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleClear}
              className="mt-1"
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-btn)',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              Import Another
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
