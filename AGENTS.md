# AssemblyOps

Volunteer scheduling and management for JW assembly/convention committees.

## Key commands (run in `backend/`)

- `npm run dev` — dev server (hot reload), against the Railway `development` env
- `npm run test:db:up` — start + migrate the local test Postgres (Docker); `test:db:down` to stop

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
- Web tier (`web/`): `web/landing/` is an Astro static site; `web/app/` (volunteer) is a Vite + React SPA with React Router. No Dart/Flutter in the repo currently.
- Commit scope is the deployable tier and nothing else: `backend`, `app`, `landing`, `ios`, `repo` (CI, templates, root docs, tooling). Retired as scopes: `web`, `admin`, `infra`, `storage`, `test`, `docs`, `ci` — `docs` and `ci` are commit **types**, not scopes. One-tier-per-PR depends on the scope being unambiguous.

## Web UI (`web/app`)

- **Every function has a visible control.** A context menu, right-click, or long-press may *duplicate* an action — never be the only path to it. If a capability can be granted, there is a visible toggle for it.
- The frozen iOS app is a reference for *what* a screen does, not for *how* it is laid out. Do not port an interaction pattern from it without checking it against the rule above.
- **Two input modes, both first-class.** Assembly-day is phones and touch; pre-assembly setup is desktop with mouse, trackpad, and keyboard. Neither is the fallback.
  - Touch targets at least 44×44 px, with spacing between adjacent destructive and non-destructive actions.
  - **No hover-only affordances.** Touch has no hover, so a control that only appears on hover does not exist on a phone — the same failure as the long-press problem, inverted.
  - Every control reachable and operable by keyboard, with a visible focus state.
  - Drag-and-drop is never the only path. The schedule builder needs a tap/click alternative that works one-handed.
- **Browser targets: all modern browsers, with Safari and Chrome as the two that must be right.** On iOS every browser is WebKit, so Safari's engine covers the whole assembly-day phone population — it is the constraint, not an afterthought. The mechanics this forces are in `web/app/AGENTS.md`.
- **Accessibility baseline: WCAG 2.2 AA.** Text contrast at least 4.5:1, UI components 3:1. Every interactive element has an accessible name. Keyboard navigation works end to end before a screen is done. This is not compliance theater — accessible controls are discoverable controls, and it is the same rule set that prevents another invisible long-press.
- For visual work — hierarchy, spacing, color, typography — use the `refactoring-ui` skill. It does not cover affordances or discoverability; that is what the rules above are for.

Why the first rule exists: in the March 2026 beta the attendance-counting permission toggle and both delete actions were reachable only by long-pressing a row (`.contextMenu` in `AssignmentsView`, `SlotDetailSheet`, `ShiftManagementView`, `ConversationListView`). Nobody found them, including the developer. The code was correct, tested, and lint-clean — no reviewer catches this class of defect.

## Workflow

GitHub Flow: `main` is the always-deployable trunk. Cut a branch off `main` (`<type>/<issue-id>-<desc>`) → PR back to `main` → **merge commit, never squash**. One tier per branch (`backend/` or `web/…`, not both). Railway auto-deploys `main` on merge. See `CONTRIBUTING.md` and `.github/` templates for issue / PR / commit format.

## Releasing

Web/backend tiers deploy continuously on merge to `main`. Mobile is store-gated — merging is not releasing:

- **Releases are tagged, not merged.** Cut a release from a `main` commit, tag it semver (`ios/v1.4.0`), and build from the tag so the exact shipped code is recoverable. Cut a short-lived `release/x.y.z` branch only to stabilize a store build while `main` keeps moving; cherry-pick fixes back to `main`, then delete it.
- **Backend stays backward-compatible.** Old app versions linger in users' hands, so GraphQL/API changes must be additive — add and deprecate fields, and retire one only once telemetry shows no live version depends on it. Never make a breaking schema change the way a web-only service would.
- **Validate through distribution tracks, not branches.** iOS via TestFlight; Android via Play testing tracks (internal → closed → open) with staged percentage rollout. These are mobile's equivalent of a staging branch — the "prove it before users get it" step lives here, not in git.

## Splitting Commits Within a Slice

A slice ships as one PR, but its commits are still grouped by layer so the history stays readable. This governs **splitting commits inside one slice** — it is never a way to scope the work itself. Stage only that layer's files for each commit. Never use `git add .` or `git add -A`.

Paths below are relative to `backend/src/` unless noted.

| Group | Prefix | Files | Description |
|-------|--------|-------|-------------|
| Docs | `docs:` | AGENTS.md, README, docs | Documentation and architectural guidance changes that aren't tied to a specific code layer. |
| Build & Config | `chore(<scope>):` | package.json, tsconfig, vite/vitest config, `.env.example` | Dependency additions/removals and environment/configuration changes that set up what the feature needs to run. |
| Migrations | `chore(<scope>):` | `prisma/migrations/` | Prisma migration files that define or alter the schema. One commit covers all migrations for the feature. |
| Domain layer | `feat(<scope>):` | `prisma/schema.prisma`, `graphql/schema/`, `graphql/validators/` | Models, SDL, and Zod input schemas — the raw building blocks with no business logic. |
| Service layer | `feat(<scope>):` | `services/` | Business logic, orchestration, third-party integrations. Depends on the domain layer; keep free of HTTP concerns. |
| Resolver layer | `feat(<scope>):` | `graphql/resolvers/` | GraphQL resolvers that delegate entirely to services. No logic here beyond mapping args → service call → response. |
| Security layer | `feat(<scope>):` | `graphql/guards/`, `middleware/` | Auth guards and cross-cutting security wiring. Security-critical — note this in the commit message. |
| Tests | `test(<scope>):` | `__tests__/` | Unit and integration tests. Commit separately so the test history is easy to audit independently of production code. |

## Stack Freeze

`web/app` runs on Vite + React; auth lives in the backend rather than a Next.js BFF. Decided 2026-07-28, landed with the first vertical slice (#196).

**No stack changes for 90 days from the day the first vertical slice merges** — no new framework, no swapping Apollo, no new UI library. Three stack decisions in the preceding 26 days each reset the learning curve to zero.

## Code Review Rules

Rules for Codex review. CI coverage differs by tier: `backend/` runs lint, Vitest, and a Docker build; `web/app/` runs lint, Vitest, and a build; `web/landing/` runs build only; `ios/` runs nothing. Do not report what a tier's own checks already catch — and do review the gaps, including lint and test coverage in `web/landing/`, and anything at all in `ios/`. Otherwise focus on behavior.

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
