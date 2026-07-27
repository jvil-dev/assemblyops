/**
 * Request-scoped i18n Configuration
 *
 * Resolves the active locale for each request and loads its message catalog.
 * Falls back to the default locale when the [locale] segment is missing or
 * is not one we serve.
 *
 * Used by: next.config.ts (via the next-intl plugin)
 */
import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = routing.locales.includes(requested as Locale)
    ? (requested as Locale)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
