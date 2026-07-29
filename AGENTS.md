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
- Commit scope is the deployable tier and nothing else: `backend`, `app`, `landing`, `ios`, `repo` (CI, templates, root docs, tooling). Retired as scopes: `web`, `admin`, `infra`, `storage`, `test`, `docs`, `ci` — `docs` and `ci` are commit **types**, not scopes. One-tier-per-PR depends on the scope being unambiguous.

## Web UI (`web/app`)

- **Every function has a visible control.** A context menu, right-click, or long-press may *duplicate* an action — never be the only path to it. If a capability can be granted, there is a visible toggle for it.
- The frozen iOS app is a reference for *what* a screen does, not for *how* it is laid out. Do not port an interaction pattern from it without checking it against the rule above.
- **Two input modes, both first-class.** Assembly-day is phones and touch; pre-assembly setup is desktop with mouse, trackpad, and keyboard. Neither is the fallback.
  - Touch targets at least 44×44 px, with spacing between adjacent destructive and non-destructive actions.
  - **No hover-only affordances.** Touch has no hover, so a control that only appears on hover does not exist on a phone — the same failure as the long-press problem, inverted.
  - Every control reachable and operable by keyboard, with a visible focus state.
  - Drag-and-drop is never the only path. The schedule builder needs a tap/click alternative that works one-handed.
- **Browser targets: all modern browsers, with Safari and Chrome as the two that must be right.** On iOS every browser is WebKit, so Safari's engine covers the whole assembly-day phone population — it is the constraint, not an afterthought.
  - Use `100dvh`, never `100vh`. Mobile Safari's viewport includes the URL bar, so `100vh` layouts clip.
  - Respect `env(safe-area-inset-*)`. Without it, bottom-anchored actions sit under the home indicator and can't be tapped.
  - Check date and time inputs in Safari specifically — it renders them very differently from Chrome.
  - Pin the target list in `browserslist` so Vite and autoprefixer build against it rather than their defaults.
- **Accessibility baseline: WCAG 2.2 AA.** Text contrast at least 4.5:1, UI components 3:1. Every interactive element has an accessible name. Keyboard navigation works end to end before a screen is done. This is not compliance theater — accessible controls are discoverable controls, and it is the same rule set that prevents another invisible long-press.
- For visual work — hierarchy, spacing, color, typography — use the `refactoring-ui` skill. It does not cover affordances or discoverability; that is what the rules above are for.

Why the first rule exists: in the March 2026 beta the attendance-counting permission toggle and both delete actions were reachable only by long-pressing a row (`.contextMenu` in `AssignmentsView`, `SlotDetailSheet`, `ShiftManagementView`, `ConversationListView`). Nobody found them, including the developer. The code was correct, tested, and lint-clean — no reviewer catches this class of defect.

## Workflow

GitHub Flow: `main` is the always-deployable trunk. Cut a branch off `main` (`<type>/<issue-id>-<desc>`) → PR back to `main` → **merge commit, never squash**. One tier per branch (`backend/` or `web/…`, not both). Railway auto-deploys `main` on merge. See `CONTRIBUTING.md` and `.github/` templates for issue / PR / commit format.

## Stack Freeze

`web/app` is moving from Next.js to Vite + React; auth moves into the backend rather than a Next.js BFF. Decided 2026-07-28, migration pending — the Next.js references above stay accurate until it lands.

**No stack changes for 90 days from the day the first vertical slice merges** — no new framework, no swapping Apollo, no new UI library. Three stack decisions in the preceding 26 days each reset the learning curve to zero.

## Code Review Rules

Rules for Codex review. CI coverage differs by tier: `backend/` runs lint, Vitest, and a Docker build; `web/app/` runs lint and build; `web/landing/` runs build only; `ios/` runs nothing. Do not report what a tier's own checks already catch — and do review the gaps, including lint in `web/landing/`, test coverage in both `web/landing/` and `web/app/`, and anything at all in `ios/`. Otherwise focus on behavior.

### Authorization

- Every resolver reaching event-, department-, or area-scoped data must pass through a guard from `graphql/guards/auth.ts`. A resolver that queries Prisma directly on a scoped model without one is a finding.
- `tryRequireAdmin` returns a boolean; `tryRequireDeptAccessByEvent` returns `{ departmentId, userId }` or `null`. Neither throws — they exist for admin-vs-scoped branching. Flag any branch that falls through to unscoped data when the check fails.
- Widening a guard (`requireDeptAccess` → `requireAuth`) is a finding unless the PR body says why.

### GraphQL surface

- Every input must be Zod-validated in `graphql/validators/` before use.
- Resolvers delegate to `services/`. Business logic, Prisma queries beyond a trivial lookup, and third-party calls belong in a service.
- **A field resolver that queries once per parent is a finding.** List queries must batch. Nothing in the repo imports `dataloader` today, so a 50-item list currently fires 51 queries — flag new field resolvers that make this worse.

### Database

- Never edit a migration that is already applied — add a new one.
- Flag destructive migration steps (column/table drop, type narrowing, a new non-null column without a default) and state the safe path.

### Secrets and environment

- There are no `.env` files. Secrets come from the Railway `development` environment at runtime. Flag any committed credential or new hardcoded connection string.
- Tests run against the local Docker Postgres, never Railway. Flag a test that reads `DATABASE_PUBLIC_URL` or reaches a remote host.

### Scope

- One tier per PR (`backend/` or `web/…`, not both).
- Every file needs a header comment describing it.
