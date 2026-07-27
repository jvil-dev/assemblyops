/**
 * Home Route
 *
 * Proof-of-wiring screen. Runs the public health query against the dev
 * backend and renders the result in a card built from the ported iOS
 * design tokens.
 */
'use client';

import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { graphql } from '@/gql';

const HealthQuery = graphql(`
  query Health {
    health {
      status
      timestamp
      database
    }
  }
`);

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();
  const { data, loading, error } = useQuery(HealthQuery);

  const healthy = data?.health.status === 'healthy';

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-xl px-screen py-xxl">
      <header className="flex flex-col gap-s">
        <h1 className="text-large-title font-semibold text-primary">
          {t('title')}
        </h1>
        <p className="text-subheadline text-ink-secondary">{t('subtitle')}</p>
      </header>

      <section className="flex flex-col gap-m rounded-card bg-surface p-card shadow-card">
        <h2 className="text-body font-semibold">{t('healthTitle')}</h2>

        {loading && (
          <p className="text-subheadline text-ink-tertiary">{t('loading')}</p>
        )}

        {error && (
          <p className="text-subheadline text-declined">{t('error')}</p>
        )}

        {data && (
          <dl className="flex flex-col gap-s">
            <Row label={t('status')}>
              <span
                className={`rounded-badge px-s py-xs text-caption font-medium ${
                  healthy
                    ? 'bg-accepted/12 text-accepted'
                    : 'bg-declined/12 text-declined'
                }`}
              >
                {data.health.status}
              </span>
            </Row>
            <Row label={t('database')}>{data.health.database}</Row>
            <Row label={t('checkedAt')}>
              {new Date(data.health.timestamp).toLocaleString(locale)}
            </Row>
          </dl>
        )}
      </section>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-divider pb-s last:border-0 last:pb-0">
      <dt className="text-caption text-ink-tertiary uppercase">{label}</dt>
      <dd className="text-subheadline">{children}</dd>
    </div>
  );
}
