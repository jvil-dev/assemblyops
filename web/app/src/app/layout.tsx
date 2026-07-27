/**
 * Root Layout
 *
 * Wraps every route in the base HTML document and loads global styles.
 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AssemblyOps',
  description: 'Volunteer scheduling for assembly and convention committees.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
