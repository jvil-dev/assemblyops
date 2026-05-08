# Phase 1 — Foundations

> **Goal:** every later sprint should be able to start by writing feature code, not by setting up tooling.
>
> **End-to-end smoke at the close of Phase 1:** Google sign-in on `app.assemblyops.org` (Flutter Web) → Firebase ID token → SpringBoot on Cloud Run → Postgres → `me` query returns user + role → Flutter routes to the right role dashboard.

## Sprint Status

| Sprint                                                               | Status          | Issue                                                  | Decision Doc                                                |
| -------------------------------------------------------------------- | --------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| 1.1 — Polyglot monorepo + Flutter scaffold + multi-target hosting    | ✅ Merged       | [#4](https://github.com/jvil-dev/assemblyops/issues/4) | [01-monorepo-layout](../architecture/01-monorepo-layout.md) |
| 1.2 — Design system extraction (Flutter ThemeData + widgets)         | 🟡 Ready for PR | [#8](https://github.com/jvil-dev/assemblyops/issues/8) | [03-design-system](../architecture/03-design-system.md)     |
| 1.3 — Auth + role detection (Flutter + Riverpod + go_router)         | ⚪ Pending      | —                                                      | —                                                           |
| 1.4 — Backend skeleton (SpringBoot + GraphQL + Postgres + Cloud Run) | ⚪ Pending      | —                                                      | —                                                           |

---

## Sprint 1.1 — Polyglot monorepo + Flutter scaffold + multi-target hosting

**Status:** 🟡 Implementation complete, PR pending
**Started:** 2026-05-08
**Issue:** [#4](https://github.com/jvil-dev/assemblyops/issues/4)
**Decision doc:** [docs/architecture/01-monorepo-layout.md](../architecture/01-monorepo-layout.md)

### What landed

- **Polyglot monorepo:** `/web` (React, existing), `/app` (Flutter), `/admin` (Flutter), `/shared_ui` (Dart pkg), `/backend` (SpringBoot, empty for now). No npm workspace — see decision doc.
- **Flutter projects scaffolded** via `flutter create`. `app` targets web+iOS+Android; `admin` targets web only. `shared_ui` wired as a path dependency in both `pubspec.yaml` files.
- **Firebase Hosting multi-target:** `firebase.json` and `.firebaserc` moved from `web/` to repo root with three targets (`web`, `app`, `admin`). New Hosting sites created: `assemblyops-app`, `assemblyops-admin`. Existing `assemblyops` site continues to serve the landing.
- **Custom domains:** `app.assemblyops.org` and `admin.assemblyops.org` added in Firebase. CNAMEs added at Squarespace. SSL cert minting in progress.
- **CI workflows path-aware:** only the affected target rebuilds; Flutter step added via `subosito/flutter-action@v2`.
- **Docs folder split:** `docs/development_plans/` (tracked), `docs/architecture/` (tracked, new), `docs/development_reference_docs/` (gitignored, confidential JW material).
- **Project `CLAUDE.md`** rewritten for the Flutter pivot.

### Verified

- ✅ `firebase deploy --only hosting:web` deploys to `assemblyops.web.app` — landing renders correctly.
- ✅ `firebase deploy --only hosting:app` deploys to `assemblyops-app.web.app` — Flutter counter renders.
- ✅ `firebase deploy --only hosting:admin` deploys to `assemblyops-admin.web.app` — Flutter counter renders.

### Snags worth remembering

- Flutter web build initially failed with shader compilation `exit -9` (SIGKILL on `impellerc`). Resolved by `flutter clean && flutter pub get && flutter build web --release`. Likely a first-run hiccup — log here in case it recurs.

### Open questions deferred

- `pubspec.lock` is currently gitignored. The Flutter docs recommend committing it for application packages (`/app`, `/admin`) but not library packages (`/shared_ui`). Revisit during Sprint 1.2.

---

## Sprint 1.2 — Design system extraction (Flutter ThemeData + widgets)

**Status:** 🟡 Implementation complete, PR pending
**Started:** 2026-05-08
**Issue:** [#8](https://github.com/jvil-dev/assemblyops/issues/8)
**Decision doc:** [docs/architecture/03-design-system.md](../architecture/03-design-system.md)

### What landed

- **Tokens** (`shared_ui/lib/tokens/`): `colors`, `spacing`, `typography` (DM Sans via google_fonts), `radii`, `shadows`, `department_colors`, `durations`. Values mirror iOS reference verbatim.
- **Theme** (`shared_ui/lib/theme.dart`): `AppTheme.light()` / `AppTheme.dark()` returning Material `ThemeData`; `AppTokens` `ThemeExtension` for mode-aware non-Material values (gradient stops, surfaceSecondary, textTertiary, divider).
- **Primitives** (`shared_ui/lib/widgets/`): `AppCard` (kind: primary/secondary, optional onTap with scale-press), `AppButton` (kind: primary/secondary/ghost/destructive, with optional icon, scale-press, disabled state), `AppBadge`, `StatusPill` (kind: pending/accepted/declined/info/success/warning).
- **Structural** (`shared_ui/lib/widgets/`): `ExpandableSection` (chevron rotates 0→90° + AnimatedSize body), `EmptyState`, `PageLayout` (gradient bg, screen-edge padding, scrollable).
- **Behaviors** (`shared_ui/lib/behaviors/`): `showAppDialog`, `showAppToast` (with kind: info/success/warning/error).
- **Widgetbook** (`shared_ui/widgetbook_app/`): dedicated web Flutter app with all 7 widget components and a Light/Dark theme toggle. Run: `flutter run -d chrome --web-port=5500`.
- **App + Admin wired** — both `app/lib/main.dart` and `admin/lib/main.dart` use `AppTheme.light()` / `dark()` with `ThemeMode.system`, and render a sample `PageLayout` + `AppCard` confirming the wire-up.

### Verified

- ✅ `flutter analyze` clean across `shared_ui/`, `app/`, `admin/`, and `shared_ui/widgetbook_app/`.
- ✅ Widgetbook on `localhost:5500` shows every primitive in light + dark; chevron animates; press scale works.
- ✅ `cd app && flutter run -d chrome --web-port=5050` shows the wired hello card with department badge + status pill.
- ✅ `cd admin && flutter run -d chrome --web-port=5051` shows the same with admin title.

### Snags worth remembering

- **Chrome blocks port 5060 (`ERR_UNSAFE_PORT`)** — it's reserved for SIP. Use `--web-port=5500` (or any other safe port) for Widgetbook.
- The default `flutter create` test files (`*/test/widget_test.dart`) reference `MyApp` and break compilation after the main.dart rewrite — deleted them. Real widget tests reintroduced when we have specific behaviors to assert.

### Open questions deferred

- Staggered entrance animations — implemented in Sprint 2A.1 (dashboard) where they're consumed.
- Riverpod-driven theme override toggle — wait until a real user setting requires it.
- Golden-image tests — Sprint 2A.1 or later.
- Custom `TabBar` styling — Material defaults are fine for now.

## Sprint 1.3 — Auth + role detection

See roadmap.

## Sprint 1.4 — Backend skeleton

See roadmap. Closes the Phase 1 end-to-end smoke loop.
