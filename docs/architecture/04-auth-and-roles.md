# 04 — Auth and roles

|                |                 |
| -------------- | --------------- |
| **Status**     | Accepted        |
| **Date**       | 2026-05-13      |
| **Sprint**     | 1.3a (issue #10) |
| **Supersedes** | —               |

## Context

Phase 1 needed a user-identity layer before any department feature work could start. The original scope was "Google sign-in only," but the requirements expanded to four sign-in methods (Google, Apple, Microsoft, Email/Password) plus a forgot-password flow, plus email verification for Email/Password signups.

The role model also pivoted mid-planning:

- **Volunteer** is the default global role for any signed-in user. Open signup — anyone with a verified email lands here.
- **Overseer** is no longer a global role. It's earned per-department-per-event by purchasing access. The purchase pipeline is deferred indefinitely; until it lands, Overseer rows can be created manually for testing.
- **Admin** is a small allowlist gating `admin.assemblyops.org`. Stub lives client-side in Sprint 1.3a; replaced by a backend env var (`BOOTSTRAP_ADMIN_EMAILS`) in Sprint 1.4.

To keep risk manageable, Sprint 1.3 split in two:

- **1.3a** — Auth shell + Google + Email/Password + forgot-password + email-verification + Riverpod + go_router + the role-model pivot. The vertical slice for the two simplest providers, on `/app` only.
- **1.3b** — Apple + Microsoft providers on `/app`. Bounded in code, unbounded in Apple/Azure console wandering. Parallelizable with 1.4.

The `/admin` portal originally shipped auth in 1.3a too; it was deferred mid-sprint (see [Admin portal defer](#admin-portal-defer) below).

## Decision

### Identity provider — Firebase Auth

Firebase Auth on the client; the backend (1.4) validates ID tokens per request, stateless — no server session. Picked for managed-service ops, native multi-platform (web + iOS + Android from one Flutter codebase), native multi-provider, and native forgot-password + email-verification flows.

Email verification is required for Email/Password signups before app access. OAuth methods (Google now, Apple/Microsoft in 1.3b) trust the provider's verification.

### Three-role model

| Role          | Scope                                  | Storage (post-1.4)                                                                  |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| **Volunteer** | Global, default for any signed-in user | `users.role = 'volunteer'`                                                          |
| **Overseer**  | Per-department-per-event               | `event_assignments.is_overseer = true` on a `user_id × event_id × department` row   |
| **Admin**     | Global, allowlist                      | Backend env var `BOOTSTRAP_ADMIN_EMAILS`; client-side stub `_kAdminAllowlist` in 1.3a |

Captains are still Volunteers with a per-event `captain_flag` on the same `event_assignments` row — not a separate role.

#### Schema sketch (not built yet — 1.4)

```sql
-- users (1 row per Firebase user)
auth_uid VARCHAR UNIQUE NOT NULL  -- Firebase UID; no longer nullable (open signup replaces invite-only)
email VARCHAR NOT NULL
role VARCHAR NOT NULL DEFAULT 'volunteer'
created_at TIMESTAMP

-- event_assignments (1 row per user × event × department)
user_id FK users
event_id FK events
department VARCHAR  -- attendant | video | audio | stage | parking
is_overseer BOOLEAN DEFAULT false
captain_flag BOOLEAN DEFAULT false
granted_via VARCHAR  -- 'purchase' | 'manual' | 'invite'
```

`event_assignments` is designed in the 1.4 ADR but the table itself isn't built until Phase 2 needs it.

### Forgot-password — single-link Firebase flow

`FirebaseAuth.sendPasswordResetEmail(email)`: Firebase emails the user a single signed link; clicking it lands on a hosted reset page; success → user signs in again with the new password. Not a multi-step code flow.

Tradeoff: lower friction, native, localizable, fewer surfaces to test. Cost: less control over the reset page's visual identity (Firebase's hosted page, not our own). Acceptable for now; revisit if branding becomes a concern.

### Email verification — only for Email/Password

OAuth providers (Google, Apple, Microsoft) already verify the email on their side. Re-verifying through Firebase adds friction with no security gain. Email/Password signups send a verification link automatically (`UserCredential.user.sendEmailVerification()` right after `createUserWithEmailAndPassword`); the router blocks routes other than `/verify-email` until `User.emailVerified` flips to true.

The router gates on:

```dart
final needsVerify =
    user.providerData.any((p) => p.providerId == 'password') &&
    !user.emailVerified;
```

A user who linked Google to an Email/Password account still counts as needing verification on the password side — the gate is per-provider, not per-user.

### Account-collision posture — auto-link, no UI

Firebase Console → Authentication → Settings → User actions: "One account per email" + auto-link enabled. If a user signs up with Google for `a@b.com`, then later tries Email/Password with the same address, Firebase auto-links the credentials onto a single user record.

No collision-handling UI built. Known limitation: a user who hits a true collision edge case (e.g., Apple's private-relay flow producing a same-as-existing email) gets a generic error message. Revisit when a real user reports the gap.

### Custom auth-email domain — `noreply@assemblyops.org`

Firebase Console → Authentication → Templates → "Customize domain" → `assemblyops.org`. DNS at Squarespace:

- **SPF** — merged with Workspace's existing `v=spf1 include:_spf.google.com ~all` to also include Firebase's sender (single TXT, no duplicates).
- **DKIM** — 2 CNAMEs Firebase generated.
- **Ownership** — 1 `firebase=…` TXT verification record.

Workspace SMTP (`noreply@assemblyops.org` as a real Gmail user) coexists with Firebase as a sender on the same domain via the merged SPF record.

### Web URL strategy — path-based

`usePathUrlStrategy()` from `flutter_web_plugins/url_strategy.dart` called before `runApp`. No hash routing (`/login`, not `/#/login`). Firebase Hosting's existing SPA rewrite (`** → /index.html`) handles deep-link refreshes.

OAuth-handler URL: `__/auth/handler` is exempt from the SPA rewrite by Firebase Hosting by default — confirmed working on `/app` for Google. `.well-known/*` rewrite exclusion deferred to 1.3b (needed for Apple domain verification).

### shared_ui stays framework-light

Auth screens are `StatelessWidget` / `StatefulWidget` with callback-based APIs. **No Firebase, no Riverpod, no go_router in `shared_ui/`.** State and side effects live in `app/` (and eventually `admin/`).

```dart
// shared_ui (pure UI)
LoginScreen(
  onGoogle: () async { /* parent handles Firebase */ },
  onEmailPassword: (email, password) async { /* parent handles Firebase */ },
  onForgotPassword: () { /* parent handles navigation */ },
  onSignUp: () { /* parent handles navigation */ },
  isLoading: bool,
  errorMessage: String?,
)
```

Tradeoff: parent (`app/` or `admin/`) wires every screen into a router + auth-actions provider, but `shared_ui/` stays consumable by Phase 9's migrated `/web` and any future surface that doesn't want to ship Firebase.

### Two Firebase Web Apps in one Firebase project

`flutterfire configure` runs separately in `app/` and `admin/`, generating two distinct `firebase_options.dart` files with different `appId`s. Same Firebase project, different Web App registrations. Required so OAuth redirect URIs can be configured per-portal in 1.3b (Apple + Microsoft expect specific authorized domains per app registration).

### Routing — go_router with redirect guards

`app/lib/auth/router.dart` exposes `appRouterProvider` as a Riverpod `Provider<GoRouter>`. The router uses `refreshListenable` tied to `authStateProvider` so redirects re-evaluate when auth state changes.

Redirect logic:

| Condition                                          | Destination       |
| -------------------------------------------------- | ----------------- |
| Auth state is loading                              | `/` (`AuthLoadingScreen`) |
| Signed out + on auth shell (`/login`, `/signup`, `/forgot-password`) | stay |
| Signed out + anywhere else                         | `/login`          |
| Signed in + Email/Password + `!emailVerified`      | `/verify-email`   |
| Signed in + verified                               | `/volunteer`      |

### Admin portal defer

`/admin` ships in 1.3a with no auth UI — just the Sprint 1.2 `_HelloDesignSystem` placeholder. The Firebase Web App registration, `admin/lib/firebase_options.dart`, and `admin/pubspec.yaml` auth deps are in place; the auth providers, router, and `/no-access` screen are not.

Reasoning:

1. Admin is a single-user portal — there's no urgency to gate it for one user.
2. Department feature work in `/app` is the critical path through Phase 2.
3. Backend (1.4) lands a real `me` endpoint that replaces the client-side `_kAdminAllowlist` stub. Doing the admin auth mirror now means redoing the role-check when the backend lands.

Pick up admin auth when an actual admin feature (event creation, user management, etc.) needs a gated route. At that point the backend `me` endpoint will be live, so the role-check moves server-side instead of using the client-side allowlist.

### Apple + Microsoft → Sprint 1.3b

Out of scope for 1.3a. 1.3b adds the two providers on `/app` only (admin defer absorbs the admin side of 1.3b too). Bounded in code: a single OAuth-button row added to `LoginScreen` + `SignUpScreen`, plus `signInWithApple()` and `signInWithMicrosoft()` methods on `AuthActions`. Unbounded in console wandering: Apple Developer portal Services ID + domain-association files, Azure App Registration + 24-month client secret, Firebase Console linkage.

## Consequences

**Pros**

- Sign-in works on web today, mobile when Phase 8 ships, with the same code path. No provider migration when adding platforms.
- Forgot-password and email-verification are zero-code surfaces — Firebase handles the email send, link signing, and verification state.
- Auto-link covers the common account-collision case without UI work.
- `shared_ui` stays consumable by `/web` Phase 9 with no Firebase coupling.
- Client-side allowlist stub for Admin keeps the `/admin` portal functional during 1.3a–1.4 without waiting for the backend.

**Cons / Sharp edges**

- Firebase's hosted reset page can't be themed beyond email-template customization. If brand consistency on the reset page becomes a priority, revisit.
- Account-collision UI gap — true edge cases (Apple private-relay producing collisions, non-auto-link-able legacy providers) surface as generic errors. Adequate until a real user reports the gap.
- Custom email domain depends on three DNS records staying in sync (SPF, DKIM, ownership TXT). Drift surfaces as silently-undelivered verification emails. Worth a periodic check.
- Microsoft client secret rotates every 24 months — the only auth-config calendar item. `HACK:` comment lands in `app/lib/auth/auth_providers.dart` when 1.3b adds Microsoft.
- Two Firebase Web Apps mean two `firebase_options.dart` files diverging over time if either portal regenerates. Track via `flutterfire configure` rerun convention.
- Email matching for the admin allowlist is case-sensitive. Firebase normalizes most emails to lowercase, so this is fine in practice — but the backend role check (1.4) should stay case-insensitive on its side.

## References

- [`docs/development_plans/00-roadmap.md`](../development_plans/00-roadmap.md) — overall plan; role-model pivot documented under Phase 1 specifics.
- [`docs/development_plans/phase-1-foundations.md`](../development_plans/phase-1-foundations.md) — Phase 1 sprint plans + status.
- [`docs/architecture/01-monorepo-layout.md`](./01-monorepo-layout.md) — repo structure.
- [`docs/architecture/03-design-system.md`](./03-design-system.md) — widgets reused by the auth screens (`PageLayout`, `AppCard`, `AppButton`, `EmptyState`).
- Firebase Auth docs — <https://firebase.google.com/docs/auth>
- go_router — <https://pub.dev/packages/go_router>
- Riverpod — <https://riverpod.dev>
- Issue #10 — the sprint that produced this ADR.
