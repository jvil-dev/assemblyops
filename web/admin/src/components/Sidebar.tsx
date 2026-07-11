/**
 * Sidebar
 *
 * Primary navigation sidebar with branded header, sectioned nav links
 * (Monitoring, App Data, Tools), active route highlighting, and
 * a user email display with sign-out button.
 *
 * Sections:
 *   - Monitoring: Overview, Infrastructure, Costs, Logs
 *   - App Data: App Metrics, Users, Events
 *   - Tools: Import Data
 *
 * Dependencies: useAuth hook
 *
 * Used by: DashboardShell
 */
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

const NAV_SECTIONS = [
  {
    title: 'MONITORING',
    items: [
      { href: '/',      label: 'Overview' },
      { href: '/infra', label: 'Infrastructure' },
      { href: '/costs', label: 'Costs' },
      { href: '/logs',  label: 'Logs' },
    ],
  },
  {
    title: 'APP DATA',
    items: [
      { href: '/metrics', label: 'App Metrics' },
      { href: '/users',   label: 'Users' },
      { href: '/events',  label: 'Events' },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { href: '/import', label: 'Import Data' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Image src="/logo.png" alt="AssemblyOps" width={36} height={36} className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-semibold text-sm text-white leading-tight">AssemblyOps</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Admin Portal</p>
        </div>
      </div>

      <nav className="flex-1 p-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title}>
            <p
              className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.3)', paddingTop: si === 0 ? 0 : 16 }}
            >
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-3 py-2 rounded-xl text-sm transition-colors"
                    style={isActive ? {
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontWeight: 600,
                    } : {
                      color: 'rgba(255,255,255,0.6)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '';
                        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="px-3 py-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
        <button
          onClick={logout}
          className="mt-1 w-full text-left px-3 py-2 text-sm rounded-xl transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
