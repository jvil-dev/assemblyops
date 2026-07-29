# AssemblyOps

Volunteer scheduling and management for JW assembly/convention committees.

## Stack

- **Backend** (`backend/`) — Node.js + TypeScript GraphQL API: Apollo Server 5, Prisma 7, PostgreSQL 18. JWT access/refresh + Google/Apple OAuth. RBAC: App Admin / Department Overseer / Volunteer.
- **iOS** (`ios/JW_AssemblyOps/`) — SwiftUI native app, Apollo iOS GraphQL client, MVVM, EN/ES localization.
- **Web** (`web/`) — `web/landing/` Astro marketing site (static), `web/app/` Next.js volunteer app.

## Backend layout (`backend/src/`)

- `graphql/schema/` — schema by domain
- `graphql/resolvers/` — resolvers
- `graphql/validators/` — Zod input validators
- `graphql/guards/` — auth guards
- `services/` — business logic (`authService`, `eventService`, `messageService`, …)
- `config/`, `middleware/`, `utils/` — wiring, cross-cutting, helpers
- `__tests__/integration/` + `__tests__/unit/` — Vitest tests
- `../prisma/schema.prisma` + `../prisma/migrations/` — DB schema & migrations

## Key commands (run in `backend/`)

- `npm run dev` — dev server (hot reload), against the Railway `development` env
- `npm run test:db:up` — start + migrate the local test Postgres (Docker); `test:db:down` to stop
- `npm test` — Vitest against that local DB (`test:coverage`, `test:watch`)
- `npm run lint` / `npm run lint:fix` / `npm run format`
- `npm run build`
- `npm run prisma:generate` / `prisma:migrate` / `prisma:seed` (`prisma:seed:dev`)

## Database

Postgres 18 on Railway (project `assemblyops`, us-east4), one `Postgres` service per environment — `production` and `development`. Services reach it over private networking (`postgres.railway.internal`); local machines use the public TCP proxy, exposed as `DATABASE_PUBLIC_URL`.

There are no `.env` files. Local dev pulls secrets from the Railway `development` environment at run time via `scripts/railway-dev.sh`, which the `dev` and `prisma:*` scripts wrap. `.env.example` documents the key list. First run on a new machine: `railway login` && `railway link`.

Tests never touch Railway — they run against a throwaway Postgres 18 from `backend/docker-compose.yml`, matching CI's service container. Test env lives in `vitest.config.ts` (fixtures, not secrets). Railway's proxy costs ~171ms per round trip, which times out `beforeAll` hooks; local is ~13x faster overall.

`DATABASE_URL` (runtime) and `DIRECT_URL` (Prisma migrations, see `prisma.config.ts`) both point at the same host — the split is a leftover from Neon's pooler and no longer means anything.

## Conventions

- Auth guards: `requireAuth`, `requireOverseer`, `requireAppAdmin`, `requireAreaOverseer`.
- Migrations named `<timestamp>_<kebab-case>`; never edit an applied migration.
- Every file carries a header comment describing it.
- No `any` types; Zod-validate all GraphQL inputs.
- Web tier (`web/`): `web/landing/` is an Astro static site (see the `astro-seo-landing` skill); `web/app/` (volunteer) is Next.js. No Dart/Flutter in the repo currently.

## Workflow

GitHub Flow: `main` is the always-deployable trunk. Cut a branch off `main` (`<type>/<issue-id>-<desc>`) → PR back to `main` → **merge commit, never squash**. One tier per branch (`backend/` or `web/…`, not both). Railway auto-deploys `main` on merge. See `CONTRIBUTING.md` and `.github/` templates for issue / PR / commit format.

## Code Review Rules

Rules for Codex review. CI coverage differs by tier: `backend/` runs lint, Vitest, and a Docker build; `web/app/` runs lint and build; `web/landing/` runs build only; `ios/` runs nothing. Do not report what a tier's own checks already catch — and do review the gaps, including lint in `web/landing/`, test coverage in both `web/landing/` and `web/app/`, and anything at all in `ios/`. Otherwise focus on behavior.

### Authorization

- Every resolver reaching event-, department-, or area-scoped data must pass through a guard from `graphql/guards/auth.ts`. A resolver that queries Prisma directly on a scoped model without one is a finding.
- `tryRequireAdmin` returns a boolean; `tryRequireDeptAccessByEvent` returns `{ departmentId, userId }` or `null`. Neither throws — they exist for admin-vs-scoped branching. Flag any branch that falls through to unscoped data when the check fails.
- Widening a guard (`requireDeptAccess` → `requireAuth`) is a finding unless the PR body says why.

### GraphQL surface

- Every input must be Zod-validated in `graphql/validators/` before use.
- Resolvers delegate to `services/`. Business logic, Prisma queries beyond a trivial lookup, and third-party calls belong in a service.

### Database

- Never edit a migration that is already applied — add a new one.
- Flag destructive migration steps (column/table drop, type narrowing, a new non-null column without a default) and state the safe path.

### Secrets and environment

- There are no `.env` files. Secrets come from the Railway `development` environment at runtime. Flag any committed credential or new hardcoded connection string.
- Tests run against the local Docker Postgres, never Railway. Flag a test that reads `DATABASE_PUBLIC_URL` or reaches a remote host.

### Scope

- One tier per PR (`backend/` or `web/…`, not both).
- Every file needs a header comment describing it.
