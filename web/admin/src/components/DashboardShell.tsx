/**
 * Dashboard Shell
 *
 * Authenticated layout wrapper for all dashboard pages.
 * Composes AuthGuard, ToastProvider, and Sidebar around page content.
 *
 * Dependencies: AuthGuard, Sidebar, ToastProvider
 *
 * Used by: All dashboard pages (Overview, Events, Users, etc.)
 */
'use client';
import { AuthGuard } from './AuthGuard';
import { Sidebar } from './Sidebar';
import { ToastProvider } from './Toast';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
