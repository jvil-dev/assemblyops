# Project Brain

## Stack

- **`/web`** — React + Vite + TypeScript + CSS Modules. Marketing landing page at `assemblyops.org`. Will be migrated to Flutter in Phase 9 (final phase).
- **`/app`** — Flutter. Main product at `app.assemblyops.org` + iOS + Android (same codebase, all three platforms).
- **`/admin`** — Flutter. Personal admin portal at `admin.assemblyops.org`.
- **`/shared_ui`** — Dart package shared by `/app` and `/admin` (tokens + primitive widgets).
- **`/backend`** — SpringBoot 3 + Spring GraphQL + Spring Data JPA + Postgres on Cloud SQL. Java 21, Gradle Kotlin DSL. Deployed to Cloud Run at `api.assemblyops.org`.

Polyglot repo — `/web` uses npm, Flutter projects use pub, `/backend` uses Gradle. Not an npm workspace.

## Hosting

Firebase Hosting multi-target on the `assemblyops` GCP project. `firebase.json` and `.firebaserc` at repo root with three targets: `web`, `app`, `admin`. Domain at Squarespace; CNAMEs for `app.` and `admin.` subdomains.

## Auth & Roles

- **Identity provider:** Firebase Auth on the client — Google, Apple, Microsoft, Email/Password — with native forgot-password and email-verification flows. SpringBoot validates Firebase ID tokens per request (stateless — no server session). Email verification is required for Email/Password signups before app access; OAuth methods trust the provider's verification.
- **Three roles:**
  - **Volunteer** — default global role. Open sign-up; anyone with a verified email lands here.
  - **Overseer** — *not* a global role. Earned per-department-per-event by purchasing access; stored in `event_assignments` (`user_id × event_id × department × is_overseer × granted_via`). Purchase pipeline is deferred indefinitely; `event_assignments` rows can be created manually for testing until then.
  - **Admin** — small allowlist via `BOOTSTRAP_ADMIN_EMAILS` env var on the backend (client-side stub for the admin portal until backend lands in Sprint 1.4). Gates `admin.assemblyops.org`.
- Captains: still Volunteers with a per-event `captain_flag` on the same `event_assignments` row, not a separate role.

## Departments (build order)

Attendants → Video → Audio → Stage → Parking. Within each department, all Overseer views ship before any Volunteer views.

## iOS reference

The archived iOS app at `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps` is the visual and feature-set source of truth for everything in `/app` and `/admin`. Attendants is the most fleshed-out department and is implemented first.

## Roadmap & docs

- `docs/development_plans/00-roadmap.md` — authoritative roadmap, sprint-by-sprint. **Tracked.**
- `docs/development_plans/phase-N-*.md` — per-phase sprint plans, created when each phase begins. **Tracked.**
- `docs/architecture/NN-*.md` — ADR-style technical decision docs (auth flow, schema choices, design tokens, etc.). **Tracked.**
- `docs/development_reference_docs/` — confidential JW reference material (CO/S documents, regional PDFs, locator images). **Gitignored — never committed.**

## Git, worktrees, TODO conventions

See [`docs/architecture/02-git-workflow.md`](./docs/architecture/02-git-workflow.md) for the full set: branch model, merge style (`--no-ff`), commit style (one task per commit, conventional prefixes, issue refs in subject), worktree convention, and the four-layer TODO/progress model (sprint issues, in-session sub-tasks, code-level `TODO`/`FIXME`/`HACK` prefixes, `backlog`-labeled GitHub issues).

Refer to Global CLAUDE.md for solo-dev lifecycle, file headers, and Claude's role.
