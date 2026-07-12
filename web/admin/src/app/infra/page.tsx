/**
 * Infrastructure Page
 *
 * Cloud Run service health, CPU/memory utilization charts, and database
 * statistics. Period selector toggles between 1h, 24h, 7d, and 30d
 * for metrics. All data auto-polls.
 *
 * Queries: CloudRunServiceStatus (30s poll), GcpMetrics (60s poll), DatabaseStats (60s poll)
 *
 * Dependencies: DashboardShell, StatCard, Chart, Skeleton, ErrorCard
 */
'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { DashboardShell } from '../../components/DashboardShell';
import { StatCard } from '../../components/StatCard';
import { Chart } from '../../components/Chart';
import { Skeleton, SkeletonChart } from '../../components/Skeleton';
import { ErrorCard } from '../../components/ErrorCard';
import { CLOUD_RUN_SERVICE_STATUS, GCP_METRICS, DATABASE_STATS } from '../../lib/queries';

type MetricPeriod = '1h' | '24h' | '7d' | '30d';

const PERIODS: { value: MetricPeriod; label: string }[] = [
  { value: '1h',  label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d',  label: '7d' },
  { value: '30d', label: '30d' },
];

interface CloudRunStatus {
  status: string;
  latestRevision: string | null;
  cpuLimit: string | null;
  memoryLimit: string | null;
  minInstances: number;
  maxInstances: number;
}

interface MetricPoint { timestamp: string; value: number; }

interface DbStats {
  databaseSize: string;
  activeConnections: number;
  tableCounts: Record<string, number>;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function InfraPage() {
  const [period, setPeriod] = useState<MetricPeriod>('24h');

  const { data: crData, loading: crLoading } = useQuery<{ cloudRunServiceStatus: CloudRunStatus }>(CLOUD_RUN_SERVICE_STATUS, {
    pollInterval: 30_000,
  });
  const { data: cpuData, loading: cpuLoading, error: cpuError, refetch: refetchCpu } = useQuery<{ gcpMetrics: MetricPoint[] }>(GCP_METRICS, {
    variables: { period, metricName: 'CPUUtilization' },
    pollInterval: 60_000,
  });
  const { data: memData, loading: memLoading, error: memError, refetch: refetchMem } = useQuery<{ gcpMetrics: MetricPoint[] }>(GCP_METRICS, {
    variables: { period, metricName: 'MemoryUtilization' },
    pollInterval: 60_000,
  });
  const { data: dbData, loading: dbLoading, error: dbError, refetch: refetchDb } = useQuery<{ databaseStats: DbStats }>(DATABASE_STATS, {
    pollInterval: 60_000,
  });

  const cr = crData?.cloudRunServiceStatus;
  const db = dbData?.databaseStats;

  const cpuChartData = (cpuData?.gcpMetrics ?? []).map(p => ({
    time: formatTime(p.timestamp),
    value: Math.round(p.value * 10) / 10,
  }));

  const memChartData = (memData?.gcpMetrics ?? []).map(p => ({
    time: formatTime(p.timestamp),
    value: Math.round(p.value * 10) / 10,
  }));

  const crStatus = cr
    ? cr.status === 'Ready' ? 'ok' : 'warn'
    : undefined;

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--divider)',
    padding: '20px',
  };

  const periodSelector = (
    <div className="flex gap-1.5">
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          style={{
            backgroundColor: period === p.value ? 'var(--primary)' : 'var(--card-secondary)',
            color: period === p.value ? '#ffffff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-badge)',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: period === p.value ? 600 : 500,
            border: period === p.value ? 'none' : '1px solid var(--divider)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Infrastructure</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Cloud Run service health and database stats</p>

        {/* Cloud Run Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Service Status"
            value={crLoading ? '—' : cr?.status ?? 'Unknown'}
            subtext={crLoading ? '' : cr?.latestRevision ? `Rev: ${cr.latestRevision}` : ''}
            status={crStatus}
          />
          <StatCard
            label="Instances"
            value={crLoading ? '—' : cr ? `${cr.minInstances} – ${cr.maxInstances}` : 'N/A'}
            subtext="min – max"
          />
          <StatCard
            label="CPU Limit"
            value={crLoading ? '—' : cr?.cpuLimit ?? 'N/A'}
          />
          <StatCard
            label="Memory Limit"
            value={crLoading ? '—' : cr?.memoryLimit ?? 'N/A'}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CPU Utilization (%)</p>
              {periodSelector}
            </div>
            {cpuError ? (
              <ErrorCard message={cpuError.message} onRetry={() => refetchCpu()} />
            ) : cpuLoading && !cpuData ? (
              <Skeleton height="160px" />
            ) : (
              <Chart data={cpuChartData} dataKey="value" xKey="time" type="area" color="#1a3d5d" height={160} unit="%" />
            )}
          </div>

          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Memory Utilization (%)</p>
              {periodSelector}
            </div>
            {memError ? (
              <ErrorCard message={memError.message} onRetry={() => refetchMem()} />
            ) : memLoading && !memData ? (
              <Skeleton height="160px" />
            ) : (
              <Chart data={memChartData} dataKey="value" xKey="time" type="area" color="#8e52d1" height={160} unit="%" />
            )}
          </div>
        </div>

        {/* Database Stats */}
        <div style={cardStyle}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Database</p>
          {dbError ? (
            <ErrorCard message={dbError.message} onRetry={() => refetchDb()} />
          ) : dbLoading && !dbData ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton height="48px" />
              <Skeleton height="48px" />
              <div className="lg:col-span-2"><Skeleton height="80px" /></div>
            </div>
          ) : db ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>DB Size</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{db.databaseSize}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Active Connections</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{db.activeConnections}</p>
              </div>
              <div className="lg:col-span-2">
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Table Counts</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(db.tableCounts).map(([key, val]) => (
                    <div
                      key={key}
                      className="px-3 py-2"
                      style={{
                        backgroundColor: 'var(--card-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--divider)',
                      }}
                    >
                      <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{key}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{Number(val).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
