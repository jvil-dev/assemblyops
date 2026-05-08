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

- Google OAuth via Firebase Auth on the client. SpringBoot validates Firebase ID tokens per request (stateless — no server session).
- **Two roles:** `OVERSEER` and `VOLUNTEER`. Captains are Volunteers with a `captain_flag` permission, not a separate role.
- First overseer is bootstrapped via `BOOTSTRAP_OVERSEER_EMAILS` env var. Volunteer invites work by pre-creating a `users` row keyed by email; the row's `auth_uid` is filled in on first Google sign-in.

## Departments (build order)

Attendants → Video → Audio → Stage → Parking. Within each department, all Overseer views ship before any Volunteer views.

## iOS reference

The archived iOS app at `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps` is the visual and feature-set source of truth for everything in `/app` and `/admin`. Attendants is the most fleshed-out department and is implemented first.

## Roadmap & docs

- `docs/development_plans/00-roadmap.md` — authoritative roadmap, sprint-by-sprint. **Tracked.**
- `docs/development_plans/phase-N-*.md` — per-phase sprint plans, created when each phase begins. **Tracked.**
- `docs/architecture/NN-*.md` — ADR-style technical decision docs (auth flow, schema choices, design tokens, etc.). **Tracked.**
- `docs/development_reference_docs/` — confidential JW reference material (CO/S documents, regional PDFs, locator images). **Gitignored — never committed.**

## Git

- `main` — live production. `development` — staging. Feature branches off `development` named `feat/<sprint-id>-<slug>`.
- All merges use `--no-ff` (create a merge commit). Never squash, never rebase-merge. Only Release PRs go `development` → `main`.
- **Commits are scoped to a single task or feature on any branch.** Stage only the files relevant to that change; never combine unrelated changes into one commit. Run `git status` before staging and inspect with `git diff --staged` before committing.

Refer to Global CLAUDE.md for solo-dev lifecycle, commit style, file headers, and Claude's role.
