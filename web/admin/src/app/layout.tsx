/**
 * Root Layout
 *
 * Next.js root layout that wraps every page with the DM Sans font
 * and the Apollo GraphQL provider.
 *
 * Metadata:
 *   - title: "AssemblyOps Admin"
 *   - description: "AssemblyOps Platform Administration"
 *
 * Dependencies: ApolloWrapper
 */
import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { ApolloWrapper } from '../components/ApolloWrapper';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'AssemblyOps Admin',
  description: 'AssemblyOps Platform Administration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  );
}
