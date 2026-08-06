# web/app — Volunteer Web Client

Vite + React single-page app for volunteers. This is the launch tier; the
SwiftUI app in `ios/` is the frozen reference spec it is ported from.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **React Router 7** — client-side routing, no server
- **Apollo Client 4** — HTTP queries and mutations, access token on every request
- **graphql-codegen** (`client` preset) — typed operations, committed to `src/gql/`
- **Tailwind 4** — design tokens ported from `ios/.../Core/Theme/AppTheme.swift`
- **Vitest** + **Testing Library** — jsdom, config lives in `vite.config.ts`

English only. Spanish is a real requirement for this product eventually, but no
issue tracks it and nothing here is translated.

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

Port 3001 is deliberate. The backend matches CORS origins exactly and returns a
hard 403 on anything else, and `http://localhost:3001` is already on its
allowlist. `vite.config.ts` sets `strictPort`, so a busy port fails loudly
instead of drifting to 3002 and getting rejected.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve `dist/` on port 3001 |
| `npm run lint` | ESLint |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run codegen` | Regenerate typed operations into `src/gql/` |

## Environment

There are no `.env` files in this repo. `VITE_API_URL` falls back to
`http://localhost:4000/graphql`, so local development needs no setup. The app
reads it through `import.meta.env`; `codegen.ts` runs in Node and reads the same
variable through `process.env`.

## Layout

```
index.html      Page shell — title, meta, viewport-fit for safe-area insets
src/
  main.tsx      Entry point: Apollo + Router providers
  App.tsx       Route table
  components/   Shared components
  routes/       One file per screen
  gql/          graphql-codegen output — generated, do not edit
  lib/          Apollo client, auth token store, shared operations
  test/         Vitest setup
```

`src/lib/` and `src/gql/` are intentionally framework-agnostic — they are the
layer a future Expo/React Native client would reuse. The view layer is not
portable and should be treated as web-only.

## Deployment

The build emits a static `dist/`. There is no Node server, so a host configured
to run `npm start` will not work — it needs a static file server with an SPA
fallback rewriting unknown paths to `index.html`, or `npm run preview`. The
Railway service for this tier is configured in the dashboard, not in this repo.
