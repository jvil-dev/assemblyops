/**
 * Locale-aware Navigation
 *
 * Wraps the Next.js navigation APIs so links and redirects keep the active
 * locale prefix without callers having to build it by hand.
 *
 * Exports: Link, redirect, usePathname, useRouter, getPathname
 *
 * Used by: any component that links or navigates
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
