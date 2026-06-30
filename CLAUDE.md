# AssemblyOps

Volunteer scheduling and management for JW assembly/convention committees.

## Stack

- **Backend** (`backend/`) — Node.js + TypeScript GraphQL API: Apollo Server 5, Prisma 7, PostgreSQL 16. JWT access/refresh + Google/Apple OAuth. RBAC: App Admin / Department Overseer / Volunteer.
- **iOS** (`ios/JW_AssemblyOps/`) — SwiftUI native app, Apollo iOS GraphQL client, MVVM, EN/ES localization.
- **Admin** (`admin/`) — Next.js admin portal.

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

- `npm run dev` — dev server (hot reload)
- `npm test` — Vitest (`test:coverage`, `test:watch`)
- `npm run lint` / `npm run lint:fix` / `npm run format`
- `npm run build`
- `npm run prisma:generate` / `prisma:migrate` / `prisma:seed` (`prisma:seed:dev`)

## Database

Postgres on Neon (project `icy-sea-11544625`, aws-us-east-1, PG16). Pooled `DATABASE_URL` / direct `DIRECT_URL`, `DATABASE_SSL=true`. Local dev/test run against a seeded `dev` branch — never production. Env selected by `NODE_ENV` (`.env.development` / `.env.production`).

## Conventions

- Auth guards: `requireAuth`, `requireOverseer`, `requireAppAdmin`, `requireAreaOverseer`.
- Migrations named `<timestamp>_<kebab-case>`; never edit an applied migration.
- Every file carries a header comment describing it.
- No `any` types; Zod-validate all GraphQL inputs.
- Web tier (`web/`) is Dart/Flutter: use the installed Dart/Flutter skills automatically (`dart-*`, `flutter-*`) — e.g. `dart-run-static-analysis`, `dart-add-unit-test`, `flutter-add-widget-test`. Invoke the relevant skill *before* writing or reviewing Dart/Flutter code, not after.

## Workflow

Branch off `development` → draft PR with `Closes #<id>` → **merge commit, never squash**. `development → main` is a deliberate release. See `CONTRIBUTING.md` and `.github/` templates for issue / PR / commit format.
