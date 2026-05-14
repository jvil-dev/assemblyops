# Phase 1 — Foundations

> **Goal:** every later sprint should be able to start by writing feature code, not by setting up tooling.
>
> **End-to-end smoke at the close of Phase 1:** Google sign-in on `app.assemblyops.org` (Flutter Web) → Firebase ID token → SpringBoot on Cloud Run → Postgres → `me` query returns user + role → Flutter routes to the right role dashboard.

## Sprint Status

| Sprint                                                               | Status          | Issue                                                  | Decision Doc                                                |
| -------------------------------------------------------------------- | --------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| 1.1 — Polyglot monorepo + Flutter scaffold + multi-target hosting    | ✅ Merged         | [#4](https://github.com/jvil-dev/assemblyops/issues/4)   | [01-monorepo-layout](../architecture/01-monorepo-layout.md) |
| 1.2 — Design system extraction (Flutter ThemeData + widgets)         | ✅ Merged         | [#8](https://github.com/jvil-dev/assemblyops/issues/8)   | [03-design-system](../architecture/03-design-system.md)     |
| 1.3a — Auth shell + Google + Email/Password (Flutter + Firebase)     | 🟡 Implementation complete, PR pending | [#10](https://github.com/jvil-dev/assemblyops/issues/10) | [04-auth-and-roles](../architecture/04-auth-and-roles.md)   |
| 1.3b — Apple + Microsoft providers                                   | ⚪ Pending        | —                                                        | —                                                           |
| 1.4 — Backend skeleton (SpringBoot + GraphQL + Postgres + Cloud Run) | ⚪ Pending        | —                                                        | —                                                           |

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

## Sprint 1.3 — Auth + role detection (Flutter + Firebase Auth)

Splits in two: **1.3a** (auth shell + Google + Email/Password + forgot password + role-model pivot) and **1.3b** (Apple + Microsoft providers, parallelizable with 1.4). The role-model pivot lands as the first 1–2 commits on the 1.3a branch — `CLAUDE.md` and `00-roadmap.md` no longer describe a global Overseer/Volunteer model with invite-only signup.

### Sprint 1.3a — Auth shell + Google + Email/Password

**Status:** 🟡 Implementation complete, PR pending
**Started:** 2026-05-08
**Issue:** [#10](https://github.com/jvil-dev/assemblyops/issues/10)
**Decision doc:** [docs/architecture/04-auth-and-roles.md](../architecture/04-auth-and-roles.md)

### What landed

- **Role-model pivot** in `CLAUDE.md`, `00-roadmap.md`, and this doc: Volunteer is the default global role (open signup), Overseer is per-department-per-event (purchase pipeline deferred), Admin is an allowlist gating `/admin` (backend takes over in 1.4).
- **Deps** added to `app/pubspec.yaml` and `admin/pubspec.yaml`: `firebase_core`, `firebase_auth`, `google_sign_in`, `flutter_riverpod`, `riverpod_annotation`, `go_router`. Dev: `riverpod_generator`, `build_runner`.
- **Firebase setup** — `flutterfire configure` run separately in `app/` and `admin/`, generating two distinct `firebase_options.dart` files (separate Web Apps in the same Firebase project). Firebase Console: Google + Email/Password providers enabled, email enumeration protection on, account auto-link on, authorized domains added (`app.assemblyops.org`, `admin.assemblyops.org`).
- **Custom auth-email sender** — `noreply@assemblyops.org` via Google Workspace. DNS at Squarespace: SPF merged with Workspace's existing record to also include Firebase, 2 DKIM CNAMEs, 1 ownership TXT.
- **shared_ui/lib/auth/** — six stateless callback-based screens (`LoginScreen`, `SignUpScreen`, `ForgotPasswordScreen`, `VerifyEmailScreen`, `AuthLoadingScreen`, `NoAccessScreen`). No Firebase or Riverpod dep in `shared_ui`. Exported from the barrel.
- **Widgetbook Auth folder** — story coverage for every auth screen in light + dark mode.
- **app/lib/auth/** — `AppRole` enum, `firebase_init.dart`, `error_messages.dart` (FirebaseAuthException → human strings), Riverpod providers (`firebaseAuthProvider`, `authStateProvider`, `currentRoleProvider`, `authActionsProvider`), `router.dart` (go_router + auth-driven redirect guards), `volunteer_home.dart` placeholder.
- **app/lib/main.dart** — wired through `ProviderScope` + `MaterialApp.router` with `usePathUrlStrategy()` so URLs are path-based.
- **`PageLayout` Material-ancestor fix** — wrapped the body in `Material(type: MaterialType.transparency)` so `TextField` and other Material-dependent widgets have an ancestor without changing the visual layout.
- **Decision doc** [04-auth-and-roles](../architecture/04-auth-and-roles.md) — Firebase Auth choice, three-role model, schema sketch for 1.4, forgot-password divergence from a code-flow approach, account-collision posture, custom-email DNS, web URL strategy, two-Web-App setup, admin portal defer, Apple+Microsoft → 1.3b.
- **Comment voice harmonized** across all Dart files — 1-line summary + optional `Features:`/`Actions:`/`States:`/`Usage:` bullet list. No rationale paragraphs, no hedge words.

### Verified

- ✅ `flutter analyze` clean across `shared_ui/`, `app/`, `admin/` (placeholder), and `shared_ui/widgetbook_app/`.
- ✅ Sign-up with email + password on `/app` → land on `/verify-email` → click link in inbox → return → "I clicked the link" → land on `/volunteer`.
- ✅ Sign-in with Google on `/app` → land on `/volunteer` directly (no verify gate).
- ✅ Forgot-password → enter email → receive Firebase reset link → reset → sign in.
- ✅ Sign-out on `/app` returns to `/login`.
- ✅ Widgetbook gallery shows all six auth screens in light + dark mode.
- ✅ Custom email domain `noreply@assemblyops.org` delivers verification + reset emails through Firebase.

### Snags worth remembering

- `TextField` requires a `Material` ancestor. `PageLayout` originally wrapped its body in just `DecoratedBox` → `SafeArea`; adding `Material(type: MaterialType.transparency)` between the gradient bg and the SafeArea gives every page a Material context without changing the visual layout.
- `flutter pub add` parses space-separated args as separate packages — use `build_runner` (single token), not `build runner`.
- `flutterfire` CLI installs to `~/.pub-cache/bin`. Add that path to the shell's `PATH` before the `flutterfire configure` step.

### Mid-sprint defer

- **`/admin` portal auth UI** — deferred indefinitely. Originally scoped to mirror `/app` auth into `admin/lib/auth/` with admin-allowlist enforcement and a dedicated `/no-access` screen. Pulled out because admin is a single-user portal (no urgency to gate it for one user), department feature work in `/app` is the critical path through Phase 2, and the backend `me` endpoint (Sprint 1.4) replaces the client-side allowlist anyway — doing the admin mirror now means redoing the role-check when the backend lands.
- `/admin` still ships with the Sprint 1.2 `_HelloDesignSystem` placeholder and the Firebase Web App registration + deps from this sprint (so auth wiring picks up halfway done when it eventually lands).
- Trigger to revive: an admin feature (event creation, user management, etc.) needs a gated route. By then the backend `me` endpoint will be live and the role-check moves server-side.

### Open items deferred (revisit later)

- **Apple + Microsoft on `/admin`** — defers along with the admin auth UI above. Sprint 1.3b narrows to `/app` only.
- **Auth tests** — auth screens are stateless callback-wrapped UI with low regression risk; manual smoke covers the wired flow. Add widget tests when a real behavior change motivates them, or when the test pattern needs to be set for the rest of the app.
- **Account-collision UI flow** — Firebase auto-link covers the common case. Build a real linking flow only if a user reports the gap.
- **MFA / 2FA** — post-Phase 1.
- **App Check / captcha** — when bot signups become a real concern (Sprint 1.4 or 2A.1).

### Sprint 1.3b — Apple + Microsoft providers (on `/app`)

**Status:** ⚪ Pending
**Issue:** —

Sibling sprint. Narrowed to `/app` only after the 1.3a admin defer (admin Apple/Microsoft work defers along with the admin auth UI). Bounded in code, unbounded in console wandering. Apple Developer portal (Services ID, `.well-known/apple-developer-domain-association.txt`, return URLs to `assemblyops.firebaseapp.com/__/auth/handler`, .p8 key); Azure AD multi-tenant + personal accounts registration with a 24-month client secret; Firebase Console provider toggles. Code changes ~5 commits. Parallelizable with Sprint 1.4 — no overlap.

## Sprint 1.4 — Backend skeleton

See roadmap. Closes the Phase 1 end-to-end smoke loop. Opens after 1.3a merges; can run alongside 1.3b.
