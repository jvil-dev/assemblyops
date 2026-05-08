# 02 — Git workflow, worktrees, and TODO conventions

|              |                                |
| ------------ | ------------------------------ |
| **Status**   | Accepted                       |
| **Date**     | 2026-05-08                     |
| **Sprint**   | Workflow chore (issue #6)      |
| **Supersedes** | The "## Git" section in `CLAUDE.md` and ad-hoc verbal practice |

## Context

Through Sprint 1.1 the project's git rules lived in three places — global `CLAUDE.md` (Claude's general rules), project `CLAUDE.md` (a "Git" section), and verbal habit. Two gaps surfaced:

- **Worktrees** — sprints span Flutter and SpringBoot, and parallel branches are sometimes useful (hotfix mid-sprint, two features in flight, dev servers that shouldn't be killed by a `git checkout`).
- **TODO discipline** — `TaskCreate` was used informally inside the assistant, code-level `TODO:` had no convention, and pre-sprint ideas had no home.

This ADR consolidates the conventions in one place. The project `CLAUDE.md` "## Git" section now points here.

## Decision

### Branch model

```
main           ← live production. Only Release PRs (development → main) merge here.
development    ← integration / staging. All feature branches PR into here.
feat/<id>-<slug> ← feature branch off development for one sprint or one chore.
fix/<slug>     ← hotfix branch off main for urgent production fixes.
```

The `<id>` matches the sprint id (e.g., `1-1`, `2a-3`, `2b-1`) or `workflow-conventions` for chores. Slug is lowercase-kebab.

### Merge style — locked

- Always `--no-ff` (Create a merge commit on the GitHub UI).
- **Never** squash. **Never** rebase-merge.
- Reflects every commit on the feature branch in the integration history.

### Commit style — locked

- Conventional prefix: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Scope where it clarifies: `feat(app):`, `chore(hosting):`, `docs(roadmap):`.
- **One task per commit** — each commit represents a single task or feature. Stage only files relevant to that change. Run `git status` before staging and `git diff --staged` before committing. Never combine unrelated changes; split, even when the changes live in the same working tree.
- Issue reference goes **in the subject line**: `chore(ci): make hosting workflows path-aware (#4)` — `closes #N` only in the PR description.
- No `Co-Authored-By:` trailers and no auto-generated footers; the user is the sole author of every commit.

### Worktrees — ad-hoc only

Default state: a single primary checkout at `~/Developer/AssemblyOps` on the active sprint branch. Spin up additional worktrees only when a real need appears.

#### Layout and naming

```
~/Developer/AssemblyOps             ← primary (default)
~/Developer/AssemblyOps-<purpose>   ← ad-hoc, removed when done
```

| `<purpose>` | Branch | Lifetime |
| ----------- | ------ | -------- |
| `hotfix` | `main` or `fix/*` | Until the hotfix PR merges |
| `<sprint-id>` (e.g. `2a3`) | `feat/<sprint-id>-<slug>` | While running two sprints in parallel |
| `dev` | `development` | Optional always-on staging view; rare |

#### Lifecycle

```bash
# Spin up on a new branch off development
git fetch origin
git worktree add ../AssemblyOps-<purpose> -b feat/<id>-<slug> origin/development

# Spin up on an existing branch
git worktree add ../AssemblyOps-hotfix main

# List
git worktree list

# Remove (after merging or aborting)
git worktree remove ../AssemblyOps-<purpose>
git worktree prune    # if a directory was deleted manually
```

#### Per-worktree first-run setup

```bash
( cd app && flutter pub get )
( cd admin && flutter pub get )
( cd shared_ui && flutter pub get )
( cd web && npm ci )                # only if working on /web
# Backend: Gradle uses ~/.gradle (shared); first bootRun warms it up.
```

#### Port collisions when running dev servers in two worktrees

| Service | Default | Override |
| ------- | ------- | -------- |
| Flutter Web | random | `flutter run -d chrome --web-port=5050` |
| SpringBoot | 8080 | `--server.port=8081` (or `application-local.yml`) |
| Vite (`/web`) | 5173 | `--port 5174` |

Convention: primary worktree uses defaults; secondary worktrees increment by 1.

#### Gotchas

- Same branch can't be checked out in two worktrees simultaneously.
- All worktrees share `.git`/origin — pushing from any worktree is global.
- `gh` and `flutter` work normally per-worktree (they read the directory's git context).

### TODO / progress tracking — four layers

#### Layer A: Sprint-level (already in place)

- One GitHub Issue per sprint (e.g., #4 = Sprint 1.1) with `phase-N` + `sprint` labels and the relevant milestone.
- Body has `## What`, `## Why`, `## Out of scope`, and an `## Acceptance criteria` checklist.
- Project board "AssemblyOps Full Release" Kanban: **Backlog → Ready → In progress → In review → Done**.
- Issue + PR cards both live on the Kanban.

#### Layer B: Within-session sub-tasks

Claude opens a `TaskCreate` list at the start of every non-trivial sprint or chore, breaking it into the steps the user will execute. Each task:

- Subject is imperative ("Scaffold Flutter projects").
- Marked `in_progress` when work begins; `completed` when done.
- Cleaned up if it becomes obsolete mid-sprint.

#### Layer C: Code-level TODOs

| Prefix       | Meaning                                                  | Example                                                              |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `TODO(#NN):` | Tracked work — `#NN` references a real GitHub issue     | `// TODO(#42): replace with shared widget once 02-design-system lands.` |
| `TODO:`      | Un-tracked — must be promoted to an issue or removed before the sprint PR merges | `// TODO: handle empty state.` |
| `FIXME:`     | Known broken — fix before merging the current PR        | `// FIXME: race condition when refresh fires twice.`                |
| `HACK:`      | Intentional shortcut — explain why and when to revisit  | `// HACK: hard-coding department until /backend/auth lands.`        |

**Rule:** a sprint PR has zero `TODO:` (un-tracked) or `FIXME:` comments at merge time. Either fix it or convert to `TODO(#NN)` linked to a backlog issue. `HACK:` is allowed at merge time.

#### Layer D: Pre-sprint backlog

GitHub Issues with the `backlog` label, sitting in the Kanban Backlog column. No `BACKLOG.md` file.

- **Capture** — open a one-line issue with `backlog` + relevant `phase-N` label. A single sentence is enough.
- **Promote** — when ready, swap `backlog` for `sprint`, add a milestone, move card to Ready/In progress.
- **Hygiene** — at the end of each phase, scan the Backlog column. Drop stale items, promote priorities.

## Consequences

**Pros**

- One place to read the rules. New AssemblyOps sessions (Claude or otherwise) can skim this one file.
- Worktrees are available without forcing the overhead of permanent multi-directory setups.
- TODO discipline becomes a routine, not a reminder.
- Code TODOs have a contract (un-tracked must be cleared before merge) instead of accumulating silently.

**Cons / Sharp edges**

- Worktrees cost disk + first-run install time; only spin them up when the situation calls for it.
- `TODO(#NN)` references can rot if issues close without the comment being addressed. Mitigated by treating it like any other comment — review during PR.
- The sprint-PR rule "zero un-tracked `TODO:` at merge time" requires discipline; consider a future lint job if it slips.

## References

- [`CLAUDE.md`](../../CLAUDE.md) — project brain, points here for git/workflow rules.
- [`docs/development_plans/00-roadmap.md`](../development_plans/00-roadmap.md) — roadmap, sprint plans.
- [`docs/architecture/01-monorepo-layout.md`](./01-monorepo-layout.md) — repo structure.
- Issue #6 — the chore that produced this ADR.
