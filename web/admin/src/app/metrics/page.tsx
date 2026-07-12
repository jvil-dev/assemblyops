/**
 * App Metrics Page
 *
 * User growth area chart with period selector (7d/30d/90d/1y) and
 * event statistics table with type badges, dates, and counts.
 * Supports CSV export of event stats.
 *
 * Queries: UserGrowth (by period), EventStats
 *
 * Dependencies: DashboardShell, Chart, DataTable, Skeleton, ErrorCard
 */
'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { DashboardShell } from '../../components/DashboardShell';
import { Chart } from '../../components/Chart';
import { DataTable } from '../../components/DataTable';
import { Skeleton, SkeletonTable } from '../../components/Skeleton';
import { ErrorCard } from '../../components/ErrorCard';
import { USER_GROWTH, EVENT_STATS } from '../../lib/queries';

type Period = '7d' | '30d' | '90d' | '365d';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d',   label: '7 days' },
  { value: '30d',  label: '30 days' },
  { value: '90d',  label: '90 days' },
  { value: '365d', label: '1 year' },
];

interface GrowthPoint { date: string; count: number; }
interface EventStat {
  eventId: string;
  name: string;
  eventType: string;
  startDate: string;
  volunteerCount: number;
  departmentCount: number;
  sessionCount: number;
}

export default function MetricsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: growthData, loading: growthLoading, error: growthError, refetch: refetchGrowth } = useQuery<{ userGrowth: GrowthPoint[] }>(USER_GROWTH, {
    variables: { period },
  });

  const { data: eventData, loading: eventLoading, error: eventError, refetch: refetchEvents } = useQuery<{ eventStats: EventStat[] }>(EVENT_STATS);

  const chartData = (growthData?.userGrowth ?? []).map(p => ({
    date: format(new Date(p.date), 'MMM d'),
    count: p.count,
  }));

  const eventRows = eventData?.eventStats ?? [];

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--divider)',
  };

  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>App Metrics</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>User growth and event statistics</p>

        {/* User Growth */}
        <div style={{ ...cardStyle, padding: '20px', marginBottom: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>User Growth</p>
            <div className="flex gap-1.5">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    backgroundColor: period === p.value ? 'var(--primary)' : 'var(--card-secondary)',
                    color: period === p.value ? '#ffffff' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-badge)',
                    padding: '4px 12px',
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
          </div>
          {growthError ? (
            <ErrorCard message={growthError.message} onRetry={() => refetchGrowth()} />
          ) : growthLoading && !growthData ? (
            <Skeleton height="200px" />
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No data for this period</div>
          ) : (
            <Chart data={chartData} dataKey="count" xKey="date" type="area" height={200} />
          )}
        </div>

        {/* Event Stats */}
        <div style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Events</p>
          </div>
          {eventError ? (
            <div className="p-4">
              <ErrorCard message={eventError.message} onRetry={() => refetchEvents()} />
            </div>
          ) : eventLoading && !eventData ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'eventType', label: 'Type', render: r => (
                  <span
                    className="text-xs font-semibold"
                    style={{
                      padding: '2px 10px',
                      borderRadius: 'var(--radius-badge)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                    }}
                  >
                    {r.eventType}
                  </span>
                )},
                { key: 'startDate', label: 'Date', render: r => format(new Date(r.startDate as string), 'MMM d, yyyy') },
                { key: 'volunteerCount', label: 'Volunteers', align: 'right' },
                { key: 'departmentCount', label: 'Departments', align: 'right' },
                { key: 'sessionCount', label: 'Sessions', align: 'right' },
              ]}
              rows={eventRows}
              emptyMessage="No events found"
              exportFileName="event-stats"
            />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
