# web/app — Volunteer Web Client

Next.js 16 App Router client for volunteers. This is the launch tier; the
SwiftUI app in `ios/` is the frozen reference spec it is ported from.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Apollo Client 4** — HTTP for queries/mutations, `graphql-ws` for subscriptions
- **graphql-codegen** (`client` preset) — typed operations, committed to `src/gql/`
- **Tailwind 4** — design tokens ported from `ios/.../Core/Theme/AppTheme.swift`
- **next-intl** — `en` / `es`, matching the iOS `en.lproj` / `es.lproj` bundles

## Running locally

The backend must be running first — it serves both the GraphQL endpoint and
the schema that codegen introspects.

```sh
cd backend && npm run dev     # http://localhost:4000/graphql
```

Then, in another shell:

```sh
cd web/app
npm install
npm run codegen               # regenerate src/gql/ (only when operations change)
npm run dev                   # http://localhost:3001
```

Port 3001 is deliberate — `web/admin` occupies 3000, and the backend CORS
allowlist already includes `http://localhost:3001`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on port 3001 |
| `npm run lint` | ESLint (Next 16 removed `next lint`, so the CLI is called directly) |
| `npm run codegen` | Regenerate typed operations into `src/gql/` |

## Environment

There are no `.env` files in this repo. `NEXT_PUBLIC_API_URL` falls back to
`http://localhost:4000/graphql` in `src/lib/apollo.ts`, so local development
needs no setup. Railway supplies the real value once the tier is deployed.

## Layout

```
src/
  app/          App Router routes, under a [locale] segment
  components/   Shared components
  gql/          graphql-codegen output — generated, do not edit
  i18n/         Locale routing, navigation, and request config
  lib/          Apollo client and other framework-agnostic modules
  middleware.ts Locale negotiation
messages/       en.json / es.json message catalogs
```

`src/lib/` and `src/gql/` are intentionally framework-agnostic — they are the
layer a future Expo/React Native client would reuse. The view layer is not
portable and should be treated as web-only.
