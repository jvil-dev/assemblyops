/**
 * Overview Page
 *
 * Main dashboard showing platform health at a glance. Displays app
 * analytics (users, events), Cloud Run service status, and current-month
 * GCP costs with auto-polling.
 *
 * Queries: AppAnalytics (60s poll), CloudRunServiceStatus (30s poll), GcpCostBreakdown
 *
 * Dependencies: DashboardShell, StatCard, Skeleton, ErrorCard
 */
'use client';
import { useQuery } from '@apollo/client/react';
import { format, startOfMonth } from 'date-fns';
import { DashboardShell } from '../components/DashboardShell';
import { StatCard } from '../components/StatCard';
import { SkeletonStatCard } from '../components/Skeleton';
import { ErrorCard } from '../components/ErrorCard';
import { APP_ANALYTICS, CLOUD_RUN_SERVICE_STATUS, GCP_COST_BREAKDOWN } from '../lib/queries';

interface AppAnalytics {
  totalUsers: number;
  totalOverseers: number;
  totalEvents: number;
  totalVolunteers: number;
  totalAssignments: number;
  totalCheckIns: number;
}

interface CloudRunStatus {
  status: string;
  latestRevision: string | null;
  cpuLimit: string | null;
  memoryLimit: string | null;
  minInstances: number;
  maxInstances: number;
}

interface CostEntry { service: string; amount: number; unit: string; }

export default function OverviewPage() {
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery<{ appAnalytics: AppAnalytics }>(APP_ANALYTICS, {
    pollInterval: 60_000,
  });
  const { data: crData, loading: crLoading, error: crError, refetch: refetchCr } = useQuery<{ cloudRunServiceStatus: CloudRunStatus }>(CLOUD_RUN_SERVICE_STATUS, {
    pollInterval: 30_000,
  });

  const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const end = format(new Date(), 'yyyy-MM-dd');
  const { data: costData, loading: costLoading, error: costError, refetch: refetchCost } = useQuery<{ gcpCostBreakdown: CostEntry[] }>(GCP_COST_BREAKDOWN, {
    variables: { startDate: start, endDate: end },
  });

  const analytics = analyticsData?.appAnalytics;
  const cr = crData?.cloudRunServiceStatus;
  const totalCost = costData?.gcpCostBreakdown.reduce((sum, e) => sum + e.amount, 0) ?? 0;

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

  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Overview</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Platform health at a glance</p>

        {/* Top-level error */}
        {analyticsError && !analyticsData && (
          <div className="mb-4">
            <ErrorCard message={analyticsError.message} onRetry={() => refetchAnalytics()} />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsLoading && !analyticsData ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                label="Total Users"
                value={(analytics?.totalUsers ?? 0).toLocaleString()}
                subtext={`${analytics?.totalOverseers ?? 0} overseers`}
              />
              <StatCard
                label="Total Events"
                value={(analytics?.totalEvents ?? 0).toLocaleString()}
                subtext={`${analytics?.totalVolunteers ?? 0} assignments`}
              />
            </>
          )}
          {crLoading && !crData ? (
            <SkeletonStatCard />
          ) : crError && !crData ? (
            <ErrorCard message={crError.message} onRetry={() => refetchCr()} />
          ) : (
            <StatCard
              label="Cloud Run"
              value={cr?.status ?? 'N/A'}
              subtext={cr?.latestRevision ?? ''}
              status={crStatus}
            />
          )}
          {costLoading && !costData ? (
            <SkeletonStatCard />
          ) : costError && !costData ? (
            <ErrorCard message={costError.message} onRetry={() => refetchCost()} />
          ) : (
            <StatCard
              label="Monthly Cost"
              value={totalCost > 0 ? `$${totalCost.toFixed(2)}` : '$0.00'}
              subtext="Current month (GCP)"
            />
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>App Summary</p>
            <div className="space-y-2">
              {([
                ['Check-ins', analytics?.totalCheckIns],
                ['Assignments', analytics?.totalAssignments],
                ['Volunteers', analytics?.totalVolunteers],
              ] as [string, number | undefined][]).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {analyticsLoading && !analyticsData ? '—' : (val ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {cr && (
            <div style={cardStyle}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Cloud Run Service</p>
              <div className="space-y-2">
                {([
                  ['Status', cr.status],
                  ['CPU', cr.cpuLimit ?? 'N/A'],
                  ['Memory', cr.memoryLimit ?? 'N/A'],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{val}</span>
                  </div>
                ))}
                {cr.latestRevision && (
                  <div className="flex justify-between text-sm pt-2 mt-2" style={{ borderTop: '1px solid var(--divider)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Revision</span>
                    <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                      {cr.latestRevision}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Links</p>
            <div className="space-y-2">
              {[
                { label: 'App Metrics', href: '/metrics' },
                { label: 'Infrastructure', href: '/infra' },
                { label: 'Cost Breakdown', href: '/costs' },
                { label: 'View Logs', href: '/logs' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between text-sm py-0.5 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--primary)' }}
                >
                  {link.label}
                  <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
