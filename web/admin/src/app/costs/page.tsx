/**
 * Costs Page
 *
 * GCP cost breakdown by service for the current and previous 3 months.
 * Shows total spend, a top-services bar chart, and a detailed table
 * with per-service cost and percentage of total.
 *
 * Queries: GcpCostBreakdown (by date range)
 *
 * Dependencies: DashboardShell, Chart, Skeleton, ErrorCard
 */
'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { DashboardShell } from '../../components/DashboardShell';
import { Chart } from '../../components/Chart';
import { SkeletonChart, SkeletonTable } from '../../components/Skeleton';
import { ErrorCard } from '../../components/ErrorCard';
import { GCP_COST_BREAKDOWN } from '../../lib/queries';

interface CostEntry {
  service: string;
  amount: number;
  unit: string;
}

const MONTH_OPTIONS = [0, 1, 2, 3].map(offset => {
  const d = subMonths(new Date(), offset);
  return {
    label: format(d, 'MMMM yyyy'),
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: offset === 0
      ? format(new Date(), 'yyyy-MM-dd')
      : format(startOfMonth(subMonths(d, -1)), 'yyyy-MM-dd'),
  };
});

export default function CostsPage() {
  const [monthIdx, setMonthIdx] = useState(0);
  const selected = MONTH_OPTIONS[monthIdx];

  const { data, loading, error, refetch } = useQuery<{ gcpCostBreakdown: CostEntry[] }>(GCP_COST_BREAKDOWN, {
    variables: { startDate: selected.start, endDate: selected.end },
  });

  const entries: CostEntry[] = (data?.gcpCostBreakdown ?? [])
    .filter(e => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  const chartData = entries.slice(0, 10).map(e => ({
    service: e.service.length > 24 ? e.service.substring(0, 24) + '…' : e.service,
    amount: Math.round(e.amount * 100) / 100,
  }));

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--divider)',
  };

  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Costs</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>GCP cost breakdown by service</p>

        {/* Month selector */}
        <div className="flex gap-2 mb-6">
          {MONTH_OPTIONS.map((m, i) => (
            <button
              key={m.start}
              onClick={() => setMonthIdx(i)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: monthIdx === i ? 600 : 500,
                borderRadius: 'var(--radius-btn)',
                backgroundColor: monthIdx === i ? 'var(--primary)' : 'var(--card)',
                color: monthIdx === i ? '#ffffff' : 'var(--text-secondary)',
                border: monthIdx === i ? 'none' : '1px solid var(--divider)',
                boxShadow: monthIdx === i ? 'none' : 'var(--shadow-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error ? (
          <ErrorCard message={error.message} onRetry={() => refetch()} />
        ) : loading ? (
          <div className="space-y-4">
            <SkeletonChart height={200} />
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <>
            {/* Total */}
            <div style={{ ...cardStyle, padding: '20px', marginBottom: '24px' }} className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total for {selected.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>${total.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{entries.length} services billed</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{selected.start} → {selected.end}</p>
              </div>
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div style={{ ...cardStyle, padding: '20px', marginBottom: '24px' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Services</p>
                <Chart
                  data={chartData}
                  dataKey="amount"
                  xKey="service"
                  type="bar"
                  color="#1a3d5d"
                  height={220}
                  formatY={(v) => `$${Number(v).toFixed(2)}`}
                />
              </div>
            )}

            {/* Table */}
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>All Services</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                    <th className="py-3 px-5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Service</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Cost</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr
                      key={i}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--divider)' }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-secondary)'}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.backgroundColor = ''}
                    >
                      <td className="py-3 px-5" style={{ color: 'var(--text-primary)' }}>{e.service}</td>
                      <td className="py-3 px-5 text-right font-medium" style={{ color: 'var(--text-primary)' }}>${e.amount.toFixed(4)}</td>
                      <td className="py-3 px-5 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {total > 0 ? ((e.amount / total) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                  {entries.length > 0 && (
                    <tr className="font-semibold" style={{ backgroundColor: 'var(--card-secondary)' }}>
                      <td className="py-3 px-5" style={{ color: 'var(--text-primary)' }}>Total</td>
                      <td className="py-3 px-5 text-right" style={{ color: 'var(--text-primary)' }}>${total.toFixed(4)}</td>
                      <td className="py-3 px-5 text-right" style={{ color: 'var(--text-secondary)' }}>100%</td>
                    </tr>
                  )}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center" style={{ color: 'var(--text-tertiary)' }}>No cost data for this period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
