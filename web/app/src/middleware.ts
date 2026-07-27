/**
 * Locale Middleware
 *
 * Negotiates the request locale and rewrites to the matching [locale]
 * segment. Skips Next internals, the API routes, and anything that looks
 * like a static file.
 */
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
