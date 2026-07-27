/**
 * Root Layout
 *
 * Locale-segmented root layout. Establishes the message catalog for the
 * request and provides the Apollo GraphQL context to every route.
 *
 * Dependencies: ApolloWrapper, i18n/routing
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ApolloWrapper } from '@/components/ApolloWrapper';
import { routing, type Locale } from '@/i18n/routing';
import '../globals.css';

export const metadata: Metadata = {
  title: 'AssemblyOps',
  description: 'Volunteer scheduling for assembly and convention committees.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider>
          <ApolloWrapper>{children}</ApolloWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
