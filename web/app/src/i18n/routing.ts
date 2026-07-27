/**
 * Locale Routing
 *
 * Defines the locales the volunteer web client serves and how they appear
 * in the URL. Mirrors the iOS bundle, which ships en.lproj and es.lproj.
 *
 * Exports: routing, Locale
 *
 * Used by: middleware, i18n/request, i18n/navigation
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
});

export type Locale = (typeof routing.locales)[number];
