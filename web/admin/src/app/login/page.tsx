/**
 * Login Page
 *
 * Email/password login form for admin portal access.
 * Only users with isAppAdmin flag are granted entry.
 *
 * Dependencies: useAuth hook
 */
'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(to bottom, var(--bg-top), var(--bg-bottom))' }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--divider)',
        }}
      >
        <div className="mb-7">
          <div className="w-14 h-14 mb-5">
            <Image src="/logo.png" alt="AssemblyOps" width={56} height={56} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>AssemblyOps Admin</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to your admin account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 text-sm focus:outline-none transition-all"
            style={{
              height: '50px',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--radius-btn)',
              backgroundColor: 'var(--card-secondary)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--primary)'}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--divider)'}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 text-sm focus:outline-none transition-all"
            style={{
              height: '50px',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--radius-btn)',
              backgroundColor: 'var(--card-secondary)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--primary)'}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--divider)'}
            required
          />
          {error && (
            <p
              className="text-sm px-3 py-2"
              style={{
                color: 'var(--status-error)',
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white text-sm font-semibold transition-opacity"
            style={{
              height: '50px',
              backgroundColor: 'var(--primary)',
              borderRadius: 'var(--radius-btn)',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
