# AssemblyOps Admin Portal

Internal administration dashboard for monitoring the AssemblyOps platform. Provides real-time infrastructure health, app analytics, user/event management, and data import tools.

## Pages

| Route      | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `/`        | Overview — platform health at a glance                         |
| `/infra`   | Infrastructure — ECS tasks, CPU/memory charts, DB stats        |
| `/costs`   | Costs — AWS cost breakdown by service and month                |
| `/logs`    | Logs — CloudWatch log viewer with filter patterns              |
| `/metrics` | App Metrics — user growth chart, event statistics              |
| `/users`   | Users — searchable, paginated user directory                   |
| `/events`  | Events — paginated event list with type/venue/counts           |
| `/import`  | Import Data — CSV upload for congregations, events, volunteers |
| `/login`   | Login — email/password (requires `isAppAdmin` flag)            |

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** with TypeScript
- **Apollo Client 4** (GraphQL)
- **Recharts** (area, line, bar charts)
- **Tailwind CSS 4**
- **date-fns** (date formatting)

Design tokens in `globals.css` mirror the iOS `AppTheme` for visual consistency (colors, radii, shadows).

## Getting Started

```bash
cd admin
npm install
```

Create `.env.local` with the GraphQL API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
```

Start the dev server:

```bash
npm run dev    # → http://localhost:3000
```

> **Note:** The backend must be running for the admin portal to function. See the root [README](../README.md) for backend setup.

## Scripts

| Script          | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Production build             |
| `npm run start` | Serve production build       |

## Project Structure

```text
admin/
├── src/
│   ├── app/              # Next.js pages (App Router)
│   │   ├── layout.tsx     # Root layout (font, Apollo provider)
│   │   ├── page.tsx       # Overview dashboard
│   │   ├── login/         # Login page
│   │   ├── events/        # Events list
│   │   ├── users/         # User directory
│   │   ├── costs/         # AWS cost breakdown
│   │   ├── import/        # CSV data import
│   │   ├── infra/         # Infrastructure monitoring
│   │   ├── logs/          # CloudWatch log viewer
│   │   └── metrics/       # App metrics & charts
│   ├── components/        # Reusable UI components
│   │   ├── DashboardShell # Auth + sidebar + toast layout
│   │   ├── Chart          # Recharts wrapper (area/line/bar)
│   │   ├── DataTable      # Generic table with CSV export
│   │   ├── StatCard       # Metric card with status dot
│   │   ├── Skeleton       # Loading placeholders
│   │   ├── LogViewer      # Terminal-style log display
│   │   ├── ErrorCard      # Error state with retry
│   │   ├── Toast          # Notification system
│   │   ├── Sidebar        # Navigation sidebar
│   │   ├── AuthGuard      # Route protection
│   │   └── ApolloWrapper  # GraphQL provider
│   ├── hooks/
│   │   └── useAuth.ts     # Auth state, login, logout
│   └── lib/
│       ├── apollo.ts      # Apollo Client configuration
│       ├── auth.ts        # Token storage utilities
│       └── queries.ts     # All GraphQL queries & mutations
└── public/
    └── logo.png           # App logo
```

## Access Control

Only users with the `isAppAdmin` flag set to `true` can log in. The `AuthGuard` component redirects unauthenticated users to `/login`. Tokens are stored in `localStorage` and attached to all GraphQL requests via the Apollo auth link.
