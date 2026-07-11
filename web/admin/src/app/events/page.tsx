/**
 * Events Page
 *
 * Paginated table of all platform events with type badges,
 * date ranges, venue, and volunteer/department/overseer counts.
 * Supports CSV export.
 *
 * Queries: AdminListEvents (paginated)
 *
 * Dependencies: DashboardShell, DataTable, Skeleton, ErrorCard
 */
'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { DashboardShell } from '../../components/DashboardShell';
import { DataTable } from '../../components/DataTable';
import { SkeletonTable } from '../../components/Skeleton';
import { ErrorCard } from '../../components/ErrorCard';
import { ADMIN_LIST_EVENTS } from '../../lib/queries';

const PAGE_SIZE = 25;

interface AdminEventDetail {
  eventId: string;
  name: string;
  eventType: string;
  startDate: string;
  endDate: string;
  venue: string;
  state: string | null;
  volunteerCount: number;
  departmentCount: number;
  sessionCount: number;
  overseerCount: number;
}

interface AdminEventList {
  adminListEvents: {
    events: AdminEventDetail[];
    totalCount: number;
  };
}

export default function EventsPage() {
  const [page, setPage] = useState(0);

  const { data, loading, error, refetch } = useQuery<AdminEventList>(ADMIN_LIST_EVENTS, {
    variables: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  });

  const events = data?.adminListEvents.events ?? [];
  const totalCount = data?.adminListEvents.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--divider)',
  };

  return (
    <DashboardShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Events</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All platform events</p>
          </div>
          <span
            className="text-xs font-semibold"
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-badge)',
              backgroundColor: 'var(--card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--divider)',
            }}
          >
            {totalCount} events
          </span>
        </div>

        {error ? (
          <ErrorCard message={error.message} onRetry={() => refetch()} />
        ) : loading ? (
          <SkeletonTable rows={8} />
        ) : (
          <div style={cardStyle}>
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
                { key: 'dates', label: 'Dates', render: r => {
                  const start = format(new Date(r.startDate as string), 'MMM d');
                  const end = format(new Date(r.endDate as string), 'MMM d, yyyy');
                  return `${start} – ${end}`;
                }},
                { key: 'venue', label: 'Venue' },
                { key: 'volunteerCount', label: 'Volunteers', align: 'right' },
                { key: 'departmentCount', label: 'Depts', align: 'right' },
                { key: 'overseerCount', label: 'Overseers', align: 'right' },
              ]}
              rows={events}
              emptyMessage="No events found"
              exportFileName="events"
            />
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="text-sm font-semibold"
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-btn)',
                backgroundColor: page === 0 ? 'transparent' : 'var(--card)',
                color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                border: page === 0 ? 'none' : '1px solid var(--divider)',
                boxShadow: page === 0 ? 'none' : 'var(--shadow-subtle)',
                cursor: page === 0 ? 'default' : 'pointer',
              }}
            >
              ← Previous
            </button>
            <span
              className="text-xs font-medium"
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-badge)',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
              }}
            >
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page + 1 >= totalPages}
              className="text-sm font-semibold"
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-btn)',
                backgroundColor: page + 1 >= totalPages ? 'transparent' : 'var(--card)',
                color: page + 1 >= totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                border: page + 1 >= totalPages ? 'none' : '1px solid var(--divider)',
                boxShadow: page + 1 >= totalPages ? 'none' : 'var(--shadow-subtle)',
                cursor: page + 1 >= totalPages ? 'default' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
