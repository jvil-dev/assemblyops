# 01 — Monorepo Layout

|                |            |
| -------------- | ---------- |
| **Status**     | Accepted   |
| **Date**       | 2026-05-08 |
| **Sprint**     | 1.1        |
| **Supersedes** | —          |

## Context

AssemblyOps ships four user-facing surfaces:

1. **Marketing landing page** — `assemblyops.org` (React/Vite/TS, already live).
2. **Main app** — `app.assemblyops.org` + iOS + Android (Flutter, single codebase).
3. **Admin portal** — `admin.assemblyops.org` (Flutter, web-first).
4. **Backend API** — `api.assemblyops.org` (SpringBoot/Java/GraphQL/Postgres on Cloud Run).

These are owned by one solo dev. Cross-cutting changes (a new GraphQL query consumed by both `app` and `admin`, for example) are common. Splitting them across separate Git repos would mean coordinating multi-repo PRs for ordinary work — friction without offsetting benefit at this stage.

The original plan (2026-05-07) called for a pnpm workspace monorepo. The Flutter pivot (2026-05-08) invalidated that — `app/` and `admin/` are Dart, not JavaScript.

## Decision

Single Git repo as a **polyglot directory tree**:

```
/web        → React/Vite/TS (npm)        → assemblyops.org
/app        → Flutter (pub)              → app.assemblyops.org + iOS + Android
/admin      → Flutter (pub)              → admin.assemblyops.org
/shared_ui  → Flutter package (pub)      → consumed by /app and /admin via path dep
/backend    → SpringBoot (Gradle)        → api.assemblyops.org
/docs       → Markdown only
/.github    → CI for the whole tree
```

**No npm workspace.** Each project owns its own package manager:

- `/web` — npm
- `/app`, `/admin`, `/shared_ui` — pub (Flutter/Dart)
- `/backend` — Gradle Kotlin DSL (Java 21)

### Firebase Hosting

A single `firebase.json` at repo root with three Hosting targets:

| Target  | Built from        | Site                | Custom domain           |
| ------- | ----------------- | ------------------- | ----------------------- |
| `web`   | `web/dist`        | `assemblyops`       | `assemblyops.org`       |
| `app`   | `app/build/web`   | `assemblyops-app`   | `app.assemblyops.org`   |
| `admin` | `admin/build/web` | `assemblyops-admin` | `admin.assemblyops.org` |

Each target has a `rewrites: ** → /index.html` rule for SPA client-side routing (React Router on `web`, go_router on Flutter `app`/`admin`).

### CI

`.github/workflows/firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml` use a `detect-changes` job (`dorny/paths-filter@v3`) and three independent deploy jobs gated on path filters:

- Changes touching `web/**` → only `web` rebuilds and deploys.
- Changes touching `app/**` or `shared_ui/**` → only `app` rebuilds.
- Changes touching `admin/**` or `shared_ui/**` → only `admin` rebuilds.
- Changes touching `firebase.json` or `.firebaserc` → all three rebuild (config affects every target).

Flutter CI uses `subosito/flutter-action@v2` pinned to Flutter 3.41.9 stable.

### Docs folder split

| Folder                             | Status     | Contents                                                                           |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `docs/development_plans/`          | tracked    | Roadmap + per-phase sprint plans                                                   |
| `docs/architecture/`               | tracked    | ADR-style technical decision docs (this file is one)                               |
| `docs/development_reference_docs/` | gitignored | Confidential JW reference material (CO/S documents, regional PDFs, locator images) |

## Consequences

**Pros**

- One PR can touch frontend + backend together — natural for vertical slices.
- Shared CI, shared `.gitignore`, shared docs.
- `/shared_ui` is consumed by both Flutter projects via local path deps; no publishing step.
- Path-aware CI keeps build times honest (Flutter web build is ~1 min; React build is ~5 sec — rebuilding all three on every change would be wasteful).

**Cons**

- No type-system unification across `/app` (Dart) and `/web` (TypeScript). Acceptable: the two have different audiences (volunteers vs. marketing visitors) and rarely share code.
- Polyglot repos are harder to onboard a contributor to — fine while solo.
- `pubspec.lock` is currently gitignored (blanket Flutter ignore). Flutter docs recommend committing it for application packages (`/app`, `/admin`) but not library packages (`/shared_ui`). Refine in Sprint 1.2 if it bites.

## References

- Roadmap: [`docs/development_plans/00-roadmap.md`](../development_plans/00-roadmap.md)
- Phase 1 plan: [`docs/development_plans/phase-1-foundations.md`](../development_plans/phase-1-foundations.md)
- Project Brain: [`CLAUDE.md`](../../CLAUDE.md)
- Sprint 1.1 issue: [#4](https://github.com/jvil-dev/assemblyops/issues/4)
