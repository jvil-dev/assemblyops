/**
 * Users Page
 *
 * Searchable, paginated user directory with role badges
 * (App Admin, Overseer, User), event counts, and creation dates.
 * Search is debounced at 300ms.
 *
 * Queries: AdminListUsers (paginated, searchable)
 *
 * Dependencies: DashboardShell, DataTable, Skeleton, ErrorCard
 */
'use client';
import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { DashboardShell } from '../../components/DashboardShell';
import { DataTable } from '../../components/DataTable';
import { SkeletonTable } from '../../components/Skeleton';
import { ErrorCard } from '../../components/ErrorCard';
import { ADMIN_LIST_USERS } from '../../lib/queries';

const PAGE_SIZE = 25;

interface AdminUser {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isOverseer: boolean;
  isAppAdmin: boolean;
  createdAt: string;
  eventCount: number;
}

interface AdminUserList {
  adminListUsers: {
    users: AdminUser[];
    totalCount: number;
  };
}

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { data, loading, error, refetch } = useQuery<AdminUserList>(ADMIN_LIST_USERS, {
    variables: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, search: search || undefined },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(0);
    }, 300);
  }, []);

  const users = data?.adminListUsers.users ?? [];
  const totalCount = data?.adminListUsers.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--divider)',
  };

  const inputStyle: React.CSSProperties = {
    height: 44,
    backgroundColor: 'var(--card)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-btn)',
    padding: '0 16px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxShadow: 'var(--shadow-subtle)',
    width: 320,
    transition: 'border-color 0.15s',
  };

  function roleBadge(user: AdminUser) {
    if (user.isAppAdmin) {
      return (
        <span className="text-xs font-semibold" style={{ padding: '2px 10px', borderRadius: 'var(--radius-badge)', backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--status-error)' }}>
          App Admin
        </span>
      );
    }
    if (user.isOverseer) {
      return (
        <span className="text-xs font-semibold" style={{ padding: '2px 10px', borderRadius: 'var(--radius-badge)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
          Overseer
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold" style={{ padding: '2px 10px', borderRadius: 'var(--radius-badge)', backgroundColor: 'var(--card-secondary)', color: 'var(--text-secondary)' }}>
        User
      </span>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Users</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Platform user directory</p>

        <div className="flex items-center justify-between mb-5">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--primary)'}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--divider)'}
          />
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
            {totalCount} users
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
                { key: 'name', label: 'Name', render: r => `${r.firstName} ${r.lastName}` },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: r => roleBadge(r) },
                { key: 'eventCount', label: 'Events', align: 'right' },
                { key: 'createdAt', label: 'Created', render: r => format(new Date(r.createdAt as string), 'MMM d, yyyy') },
              ]}
              rows={users}
              emptyMessage="No users found"
              exportFileName="users"
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
