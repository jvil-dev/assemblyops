# AssemblyOps Development Roadmap

> Status: **Draft — pending review.** Approved as a plan in chat on 2026-05-08 (revised from 2026-05-07 with the Flutter pivot). Saved here so it can be reviewed and edited in-tree before Sprint 1.1 begins.

## Context

`assemblyops.org` (the marketing landing page) just shipped on Firebase Hosting — that's the entire codebase today. Three more products are planned: `app.assemblyops.org` (the web app, the main product), mobile apps for iOS and Android, and `admin.assemblyops.org` (a personal admin portal). The archived iOS app at `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps` is the visual and feature-set reference; its Attendants department is the most complete (~48 Swift files, 20+ GraphQL queries, three roles).

This document is the development roadmap that breaks the work into ordered, sittable sprints.

### Locked decisions

**Strategic (locked 2026-05-07)**

- **Backend stack:** SpringBoot + GraphQL + Postgres (Cloud SQL on GCP). The iOS app's `.graphql` files become the schema reference.
- **Roles:** Three — **Volunteer** (default global, open signup), **Overseer** (per-department-per-event, earned by purchasing access; purchase pipeline deferred indefinitely), **Admin** (small allowlist for `admin.assemblyops.org`). Captains are Volunteers with a per-event `captain_flag` on `event_assignments`. (Pivoted 2026-05-08; see `docs/architecture/04-auth-and-roles.md`.)
- **Department order:** Attendants → Video → Audio → Stage → Parking. Within each: all Overseer views first, then all Volunteer views.
- **Quality bar:** ship-quality code, defendable in review. Sprint cadence is paced by quality, not velocity.
- **Plan log location:** roadmap + per-sprint plans live in `docs/development_plans/` (tracked). Technical decision docs (ADR-style) live in `docs/architecture/` (tracked). Confidential JW reference material (CO/S documents, regional PDFs, locator images) lives in `docs/development_reference_docs/` (gitignored — never committed).

**Phase 1 specifics (locked 2026-05-08)**

**Big pivot:** `app/` and `admin/` are **Flutter**, not React. Same Flutter codebase compiles to web, iOS, and Android — collapsing the original Phases 8/9 (native Swift + native Kotlin) into a single mobile-build-pipeline phase. `web/` (the marketing landing page) stays React/Vite/CSS-Modules.

- **Repo structure (polyglot):**
  - `/web` — React/Vite/TS (existing landing page, unchanged)
  - `/app` — Flutter (web + iOS + Android targets)
  - `/admin` — Flutter (web target primarily; mobile optional)
  - `/shared_ui` — Flutter package (Dart) with tokens + widgets shared by `app` and `admin`
  - `/backend` — SpringBoot (Java 21 + Gradle Kotlin DSL)
- **No npm workspaces.** `web/` is its own self-contained npm project. Flutter projects use pub. Java uses Gradle. The "monorepo" is a polyglot directory tree, not an npm workspace graph.
- **Firebase Hosting:** multi-target. `firebase.json` moves from `web/` to repo root with three targets (`web` → `web/dist`, `app` → `app/build/web`, `admin` → `admin/build/web`).
- **Flutter state management:** **Riverpod** (with `riverpod_generator` + `build_runner`).
- **Flutter routing:** **go_router** with role-based redirect guards.
- **Flutter GraphQL client:** **graphql_flutter** (simpler runtime-typed client; trade compile-time safety for faster iteration).
- **Flutter component docs:** **Widgetbook** in the `shared_ui` package.
- **Flutter web renderer:** **CanvasKit** (default; pixel parity with mobile; ~1.5 MB initial download accepted).
- **Typography:** DM Sans via the `google_fonts` Dart package.
- **Icons:** Material Icons + custom SVG glyphs where iOS uses SF Symbols.
- **Auth providers:** Firebase Auth on the client — Google, Apple, Microsoft, Email/Password — plus native forgot-password and email verification. Firebase Admin SDK in SpringBoot for ID-token verification per request. **Stateless** — no SpringBoot session. Email verification required for Email/Password only; OAuth providers trust the issuer.
- **Admin bootstrap:** SpringBoot reads `BOOTSTRAP_ADMIN_EMAILS` env var; matching email becomes Admin on first login. (Sprint 1.3 stubs this client-side; Sprint 1.4 lands the real env-var-driven mechanism.)
- **Volunteer signup:** **open** — anyone with a verified email gets a Volunteer row. No invite gate. (Pivoted 2026-05-08 from the original invite-only model.)
- **Overseer access:** per-department-per-event, written to `event_assignments` (user × event × department × `is_overseer` × `granted_via`). Purchase pipeline (Stripe etc.) is **not scheduled**; for Phase 2 testing, Overseer rows are created manually.
- **Email domain restriction:** none (any provider account).
- **Backend build tool:** Gradle Kotlin DSL.
- **GraphQL approach (backend):** schema-first — `.graphqls` files copied from iOS reference, Spring GraphQL generates Java types.
- **Java version:** 21 LTS.
- **Cloud SQL connectivity:** Public IP + Cloud Run native Cloud SQL connection.
- **Local DB:** docker-compose Postgres in `backend/`.
- **N+1 prevention:** Spring GraphQL DataLoader registry from day 1.
- **Observability:** Spring Boot Actuator, structured JSON logging (Cloud Logging), OpenTelemetry → Cloud Trace.
- **Flutter learning ramp:** user has tutorial-level Dart/Flutter exposure but hasn't shipped. Sprint 1.2 (design system) is the natural learning ramp.

---

## Phase Overview

| Phase | What ships                                                                              | Sprints    |
| ----- | --------------------------------------------------------------------------------------- | ---------- |
| **0** | Marketing site (assemblyops.org)                                                        | ✅ Done    |
| **1** | Foundations: polyglot monorepo, Flutter scaffold, design system, auth, backend skeleton | 4 sprints  |
| **2** | **Attendants** on `app.assemblyops.org` (Overseer → Volunteer)                          | 12 sprints |
| **3** | Video department (Overseer → Volunteer)                                                 | ~6 sprints |
| **4** | Audio department (Overseer → Volunteer)                                                 | ~6 sprints |
| **5** | Stage department (Overseer → Volunteer)                                                 | ~4 sprints |
| **6** | Parking department (greenfield — design from scratch)                                   | ~4 sprints |
| **7** | Admin portal at `admin.assemblyops.org` (Flutter)                                       | 3 sprints  |
| **8** | Mobile build pipeline — same `/app` Flutter codebase to iOS + Android stores            | ~3 sprints |
| **9** | Migrate landing page (`web/`) from React to Flutter — unify the entire stack            | ~2 sprints |

After each Phase ends (1–8), update `web/` (the landing page, still on React) to surface the newly available capabilities. The product page is a living artifact through the React era. Phase 9 is the final stack-unification step — only after all app development has concluded.

---

## Phase 1 — Foundations

> **Goal:** every later sprint should be able to start by writing feature code, not by setting up tooling. End-to-end smoke at the close of Phase 1: Google sign-in on `app.assemblyops.org` Flutter Web → Firebase ID token → SpringBoot on Cloud Run → Postgres → `me` query returns user + role → Flutter routes to the right role dashboard.

### Sprint 1.1 — Polyglot monorepo + Flutter scaffold + multi-target hosting

**Objective:** lay out the directory tree, scaffold empty `app/` and `admin/` Flutter projects, configure Firebase Hosting to deploy the three subdomains independently.

#### Steps

1. Add `/app`, `/admin`, `/shared_ui`, `/backend` directories at repo root.
2. `flutter create --org org.assemblyops --platforms=web,ios,android app` — Flutter project with web, iOS, Android targets.
3. `flutter create --org org.assemblyops --platforms=web admin` — admin starts web-only; mobile targets added later if needed.
4. `flutter create --template=package shared_ui` — Dart package consumed via path dependency by `app/` and `admin/`.
5. Move `web/firebase.json` → `firebase.json` at repo root with three Hosting targets:
   - `web` → `web/dist`
   - `app` → `app/build/web`
   - `admin` → `admin/build/web`
6. Move `web/.firebaserc` → `.firebaserc` at repo root with target aliases.
7. Update `.github/workflows/firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml`:
   - Detect changed paths; build only the affected target(s).
   - For `app/` or `admin/` changes: install Flutter via `subosito/flutter-action`, run `flutter pub get && flutter build web --release`.
   - For `web/` changes: existing Node/Vite path stays.
8. Squarespace DNS — user adds CNAME records for `app.assemblyops.org` and `admin.assemblyops.org` pointing to Firebase Hosting.
9. Add Firebase custom domains for `app.` and `admin.` via Firebase Console.
10. Verify all three Hosting targets deploy independently.

**Files to modify**

- Move `web/firebase.json` → `firebase.json`
- Move `web/.firebaserc` → `.firebaserc`
- `.github/workflows/firebase-hosting-merge.yml`
- `.github/workflows/firebase-hosting-pull-request.yml`
- `.gitignore` — add `**/build/`, `**/.dart_tool/`, `**/.flutter-plugins*`

**Files to create**

- `app/` (full Flutter project)
- `admin/` (full Flutter project)
- `shared_ui/` (Dart package skeleton)
- `app/pubspec.yaml` and `admin/pubspec.yaml` include `shared_ui:` as a path dependency
- `docs/development_plans/phase-1-foundations.md` — running per-sprint plan
- `docs/architecture/01-monorepo-layout.md` — decision doc

**Acceptance criteria**

- [ ] All three Hosting targets deploy independently via `firebase deploy --only hosting:<target>`
- [ ] CI passes on a test PR that touches only `app/` (only Flutter app builds)
- [ ] CI passes on a test PR that touches only `web/` (only landing builds)
- [ ] `app.assemblyops.org` and `admin.assemblyops.org` resolve to their Flutter "Hello World" pages
- [ ] `assemblyops.org` (existing landing page) still serves correctly
- [ ] Decision doc `01-monorepo-layout.md` written

---

### Sprint 1.2 — Design system extraction (Flutter ThemeData + widgets)

**Objective:** port iOS theme to Flutter; build the primitive widget library in `shared_ui/`. Doubles as the Flutter learning ramp.

**Source files to read**

- `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/Core/Theme/AppTheme.swift`
- `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/Core/Utils/DepartmentColors.swift`

#### Steps

1. Add `shared_ui/` deps in `pubspec.yaml`: `google_fonts`, `flutter_riverpod`.
2. `shared_ui/lib/tokens/` — Dart files exposing tokens as `const` values:
   - `colors.dart` (light + dark; surface, foreground, accent, status colors)
   - `spacing.dart` (xs/s/m/l/xl/xxl = 4/8/12/16/24/32)
   - `typography.dart` (DM Sans via `google_fonts.dmSansTextTheme()`; sizes per iOS scale)
   - `radii.dart` (8/12/14/16/24)
   - `shadows.dart`
   - `department_colors.dart` — enum + map for the 5 departments; Attendants accent `#F97316`.
3. `shared_ui/lib/theme.dart` — exposes `lightTheme()` and `darkTheme()` returning `ThemeData`.
4. Primitive widgets in `shared_ui/lib/widgets/`:
   - `AppCard`, `AppButton`, `AppBadge`, `StatusPill`, `ExpandableSection`, `EmptyState`, `PageLayout`
5. Behavior wrappers — Flutter's built-ins replace Radix:
   - `AppDialog` (wraps `showDialog`), `PopupMenuButton`, `TabBar`/`TabBarView`, `AppToast` (wraps `ScaffoldMessenger`)
6. Set up Widgetbook in `shared_ui/widgetbook/` with one `*.stories.dart` per widget.
7. Apply theme in `app/main.dart` and `admin/main.dart` via `MaterialApp(theme: lightTheme(), darkTheme: darkTheme())`.
8. Decision doc with token tables + Widgetbook screenshots.

**Files to create**

- `shared_ui/lib/tokens/{colors,spacing,typography,radii,shadows,department_colors}.dart`
- `shared_ui/lib/theme.dart`
- `shared_ui/lib/widgets/{app_card,app_button,app_badge,status_pill,expandable_section,empty_state,page_layout,app_dialog,app_toast}.dart`
- `shared_ui/lib/shared_ui.dart` (barrel export)
- `shared_ui/widgetbook/main.dart` + per-widget stories
- `docs/architecture/02-design-system.md`

**Acceptance criteria**

- [ ] All tokens exposed and importable from `package:shared_ui/shared_ui.dart`
- [ ] Each listed widget has at least one Widgetbook story
- [ ] Light + dark theme both render correctly in Widgetbook
- [ ] `app/lib/main.dart` renders an `AppCard` from `shared_ui` and looks visually correct
- [ ] Department accent colors accessible by enum (`DepartmentColors.attendant`)
- [ ] Decision doc written with screenshots

---

### Sprint 1.3 — Auth + role detection (Flutter + Firebase Auth)

Sprint 1.3 splits in two to keep risk manageable. Apple + Microsoft each have substantial out-of-codebase config (Apple Developer portal Services ID + domain verification, Azure AD multi-tenant registration with rotating secrets, OAuth redirect URI lists) that can stall a sprint, and they're fully independent of the rest of Phase 1. 1.3b runs in parallel with Sprint 1.4 if desired.

#### Sprint 1.3a — Auth shell + Google + Email/Password

**Objective:** stand up Firebase Auth with Google + Email/Password (the two simplest providers), forgot-password via Firebase's native email-link flow, email-verification gate for Email/Password, Riverpod state, and go_router with role-based redirects. Mirror the wiring in `/admin` with an admin allowlist + dedicated `/no-access` rejection screen. Bundles the role-model pivot docs update as the first commits on the same branch.

**Acceptance criteria**

- [ ] Google sign-in works on Flutter Web at `app.assemblyops.org` (Firebase Hosting preview channel)
- [ ] Email/Password signup sends verification email; user lands on `/verify-email` until verified
- [ ] Email/Password sign-in works after verification
- [ ] Forgot-password flow: enter email → Firebase sends reset link → reset → sign in
- [ ] Sign-out works on both `/app` and `/admin`
- [ ] Stub role provider routes admin-allowlisted email to `/admin/dashboard`, others to `/volunteer`
- [ ] `admin.assemblyops.org` shows `/no-access` for non-admin authenticated users (no router loop)
- [ ] `flutter analyze` clean across all four Flutter packages
- [ ] Widget + provider tests pass for the auth surface
- [ ] Custom email domain `noreply@assemblyops.org` configured in Firebase
- [ ] ADR `docs/architecture/04-auth-and-roles.md` written
- [ ] CLAUDE.md, this roadmap, and `phase-1-foundations.md` updated to reflect the role-model pivot

#### Sprint 1.3b — Apple + Microsoft providers (sibling sprint, parallelizable with 1.4)

**Objective:** add Apple and Microsoft sign-in to the existing auth surface. Mostly out-of-codebase: Apple Developer portal (Services ID, domain-association `.well-known` file, return URLs, .p8 key), Azure AD app registration (`common` tenant for personal + work-school, 24-month client secret, redirect URIs), and Firebase Console provider toggles. Code changes are ~5 commits.

**Acceptance criteria**

- [ ] Apple sign-in works on Firebase Hosting preview channel (Apple requires HTTPS — won't work on localhost)
- [ ] Microsoft sign-in works on localhost and Hosting preview, for both personal `outlook.com` accounts and multi-tenant work-school accounts
- [ ] Apple private-relay email flow works (account created with `xxx@privaterelay.appleid.com`)
- [ ] Apple domain-association files load at `app.assemblyops.org/.well-known/apple-developer-domain-association.txt` and the admin equivalent
- [ ] All four sign-in methods visible in the Widgetbook `LoginScreen` story
- [ ] Microsoft client secret expiration date documented in code (`HACK:` comment) and on the user's calendar
- [ ] ADR updated (or sibling `05-oauth-providers.md` if it grows long) with Apple + Microsoft sections

#### Schema designed (lands in Sprint 1.4)

- `users`: `id BIGSERIAL`, `email VARCHAR UNIQUE`, `auth_uid VARCHAR UNIQUE NOT NULL` (Firebase UID), `role ENUM('ADMIN','VOLUNTEER')`, `email_verified BOOLEAN`, `display_name VARCHAR`, `created_at TIMESTAMPTZ`, `claimed_at TIMESTAMPTZ`. (`auth_uid` is no longer nullable — pivot dropped invite-only signup, so no pre-create flow exists.)
- `event_assignments` (designed only — table not built until Phase 2 needs it): `user_id × event_id × department × is_overseer × captain_flag × granted_via ENUM('PURCHASE','MANUAL','INVITE') × purchase_id NULL`. FKs to future `events` table.

#### Bootstrap mechanism

- `BOOTSTRAP_ADMIN_EMAILS` env var → Spring `ApplicationRunner` ensures Admin rows exist on backend boot. Replaces the old `BOOTSTRAP_OVERSEER_EMAILS` mechanism. Sprint 1.3 stubs this client-side in `admin/lib/auth/auth_providers.dart`; Sprint 1.4 lands the real env-var-driven version.

---

### Sprint 1.4 — Backend skeleton (SpringBoot + GraphQL + Postgres + Cloud Run)

**Objective:** stand up the minimum backend that closes the Phase 1 end-to-end smoke loop.

#### Steps

1. `cd backend && gradle init --type java-application --dsl kotlin --java-version 21`.
2. `backend/build.gradle.kts` deps: spring-boot-starter, spring-boot-starter-graphql, spring-boot-starter-data-jpa, spring-boot-starter-actuator, postgresql, flyway-core, firebase-admin, micrometer-tracing-bridge-otel. Test: spring-boot-starter-test, spring-graphql-test, testcontainers-postgresql.
3. `backend/src/main/resources/graphql/schema.graphqls` — port from iOS GraphQL: `User`, `Role`, `Department`, `Event`, `Session`, plus `type Query { me: User }`.
4. JPA entities + repositories: `User`.
5. Flyway migration `V1__init.sql` — `users` table per the schema designed in Sprint 1.3.
6. `MeQueryResolver` — return current user from `SecurityContext`.
7. `FirebaseAuthFilter` — Spring `OncePerRequestFilter` verifies `Authorization: Bearer <token>`; populates `Authentication`; runs claim-row logic.
8. `BootstrapRunner` — Spring `ApplicationRunner` ensures Overseer rows exist for emails in `BOOTSTRAP_OVERSEER_EMAILS`.
9. `application.yml` + `logback-spring.xml` (structured JSON for Cloud Logging).
10. `Dockerfile` (multi-stage: Gradle build → distroless runtime).
11. `backend/docker-compose.yml` — local Postgres on `localhost:5432`.
12. Cloud SQL Postgres provisioned; Cloud Run native Cloud SQL connection via Unix socket.
13. Cloud Run service deployed; domain mapping for `api.assemblyops.org`.
14. `.github/workflows/backend-deploy.yml` — on push to `main`, build + push to Artifact Registry + deploy.
15. Wire Flutter `app/`: install `graphql_flutter`, configure `HttpLink` + `AuthLink` injecting Firebase ID token.
16. Smoke: from Flutter `app/` after sign-in, `query { me { id email role } }` returns role; router redirects correctly.

**Files to create** (key subset)

- `backend/build.gradle.kts`, `backend/settings.gradle.kts`
- `backend/src/main/java/org/assemblyops/Application.java`
- `backend/src/main/java/org/assemblyops/auth/{FirebaseAuthFilter,BootstrapRunner,SecurityConfig}.java`
- `backend/src/main/java/org/assemblyops/user/{User,UserRepository,MeQueryResolver}.java`
- `backend/src/main/resources/graphql/schema.graphqls`
- `backend/src/main/resources/db/migration/V1__init.sql`
- `backend/src/main/resources/application.yml`, `logback-spring.xml`
- `backend/Dockerfile`, `backend/docker-compose.yml`
- `backend/src/test/java/...` — Testcontainers integration test for `me`
- `app/lib/graphql/client.dart` — graphql_flutter setup
- `.github/workflows/backend-deploy.yml`
- `docs/architecture/04-backend-architecture.md`

**Acceptance criteria**

- [ ] `./gradlew test` passes (Testcontainers spins Postgres)
- [ ] `./gradlew bootRun` works locally with docker-compose Postgres
- [ ] Cloud Run deploy succeeds; `https://api.assemblyops.org/actuator/health` returns 200
- [ ] Flutter `app/` `me` query returns the signed-in user's role
- [ ] Overseer-role user lands on `/overseer/attendants`; Volunteer on `/volunteer`
- [ ] Decision doc written
- [ ] Project `CLAUDE.md` updated to lock in Flutter + SpringBoot stack

---

## Phase 2 — Attendants Department

> **Goal:** ship Overseer functional parity with iOS, then Volunteer parity.

### Phase 2A — Overseer views

The iOS Attendant Overseer Dashboard (`AttendantDashboardView.swift`) has 10 cards. Sprints group related cards.

#### Sprint 2A.1 — Dashboard shell + counts

- Render the Overseer dashboard at `/overseer/attendants` with all 10 cards.
- Live counts where the data is cheap: Safety Incidents (unresolved), Lost Person Alerts (unresolved), Meetings, Walk-Throughs.
- Other cards render with `—` placeholder linking to "Coming soon" pages.
- Establishes the dashboard pattern reused by every other department.

#### Sprint 2A.2 — Concerns hub (Safety Incidents + Lost Person Alerts)

- Both share resolve-with-notes pattern; build them together.
- iOS reference: `SafetyIncidentListView.swift`, `LostPersonAlertsView.swift`, `ResolveIncidentSheet.swift`, `VolunteerConcernDetailView.swift`.
- GraphQL: port `SafetyIncidentsQuery`, `LostPersonAlertsQuery`, `ResolveSafetyIncidentMutation`, `ResolveLostPersonAlertMutation`.
- Postgres tables: `safety_incidents`, `lost_person_alerts`.

#### Sprint 2A.3 — Posts & Areas (+ Floor Plan)

- Port the area-management surface: create/edit areas (Interior/Exterior/Seating/Baptism), associate posts, assign captains.
- iOS reference: `AreaDetailSheet.swift`, `CreateAreaSheet.swift`, `FloorPlanView.swift`, models in `AreaModels.swift`.
- GraphQL: `DepartmentAreasQuery`, `CreateAreaMutation`, `UpdateAreaMutation`, `SetAreaCaptainMutation`, `ReportFloorPlanMutation` (image upload to Cloud Storage).

#### Sprint 2A.4 — Shifts

- Shift creation/edit/delete by post, session picker, assignment view.
- iOS reference: `ShiftManagementView.swift`, `ShiftModels.swift`.
- GraphQL: `ShiftsQuery`, `CreateShiftMutation`, `UpdateShiftMutation`, `DeleteShiftMutation`.

#### Sprint 2A.5 — Lanyard tracking

- Color-coded grid of all volunteers with search/filter, tap to mark pickup/return on someone's behalf.
- iOS reference: `LanyardGridView.swift`.
- GraphQL: `LanyardStatusesQuery`, `CreateCheckInMutation` (lanyard variant).

#### Sprint 2A.6 — Attendance counts + Meetings

- Attendance breakdown by post and session; meetings CRUD with attendee picker.
- iOS reference: `AttendanceCountBreakdownView.swift`, `AttendantMeetingsView.swift`.
- GraphQL: `PostSessionStatusesQuery`, `AttendantMeetingsQuery`, `CreateAttendantMeetingMutation`, `UpdateAttendantMeetingMutation`.

#### Sprint 2A.7 — Reminder compliance + Walk-through visibility + Volunteer management

- Three lighter cards shipped together.
- Reminder compliance %, walk-through completion list, in-department volunteer management (assign role, captain flag).
- GraphQL: `MyReminderConfirmationsQuery` (overseer view), `MyWalkThroughCompletionsQuery` (overseer view), volunteer admin mutations.

**End of Phase 2A:** Update the landing page (`web/`) to advertise Overseer support for Attendants. Cut a release tag.

### Phase 2B — Volunteer views

#### Sprint 2B.1 — Volunteer home + CO-23 info guide

- Volunteer landing at `/volunteer`. Today's overview card (next shift, lanyard status pill, unread reminders).
- Read-only CO-23 reference with 8 expandable sections (`AttendantInfoView.swift`, `AttendantInfoContent.swift`).

#### Sprint 2B.2 — Lanyard + Shift reminders

- Volunteer's own lanyard pickup/return.
- Shift reminder modal flow + confirmation.
- iOS reference: `LanyardStatusView.swift`, `ShiftReminderModal.swift`, banners.
- GraphQL: `MyLanyardStatusQuery`, mutation for pickup/return; reminder confirmation mutation.

#### Sprint 2B.3 — Reporting flows

- Report Safety Incident form (10 incident types).
- Report Lost Person form.
- Walk-Through Checklist completion.
- iOS reference: `ReportSafetyIncidentView.swift`, `ReportLostPersonView.swift`, `WalkThroughChecklistView.swift`.

#### Sprint 2B.4 — My Meetings

- List of attendant meetings the volunteer is assigned to.
- iOS reference: `MyAttendantMeetingsView.swift`.

#### Sprint 2B.5 — Captain extras

- Behind the captain flag: group check-in screen and captain attendance counts.
- iOS reference: `CaptainGroupView.swift`, `CaptainAttendanceCountsView.swift`, `CaptainSchedulingView.swift`.

**End of Phase 2:** Attendants is at full iOS parity on the web. Update landing page. Cut a release.

---

## Phases 3–6 — Other departments

Each department repeats the Overseer-first → Volunteer pattern. Phase 1 establishes the design system and Phase 2 establishes the dashboard/CRUD/auth patterns; later departments are smaller but still need careful spec work.

- **Phase 3 — Video:** ~6 sprints. iOS reference has 23 Swift files; equipment-checkout patterns dominate.
- **Phase 4 — Audio:** ~6 sprints. iOS reference has 24 Swift files; equipment + safety briefings + hazard assessments.
- **Phase 5 — Stage:** ~4 sprints. iOS reference is skeletal (10 files) — expect to design from scratch with Attendants as the visual template.
- **Phase 6 — Parking:** ~4 sprints. **No iOS reference.** First task in this phase is a design spike captured in `docs/architecture/parking-spec.md`.

After each phase, update the landing page and cut a release.

---

## Phase 7 — Admin portal (admin.assemblyops.org)

Personal portal — only your account has access. Built in Flutter (same stack as `app/`).

- **Sprint 7.1:** App shell + Firebase Auth gate (allowlist your email at the SpringBoot layer too).
- **Sprint 7.2:** Usage dashboards — pull from GCP Cloud Monitoring (Cloud Run request count, Cloud SQL CPU, Hosting bandwidth) via the Monitoring API.
- **Sprint 7.3:** Billing surface — GCP Billing export → BigQuery → small admin queries; Firebase Auth user count + storage stats.

---

## Phase 8 — Mobile build pipeline

> The Flutter `/app` codebase already runs on iOS and Android — this phase is **just** the build/release pipeline, not new feature work.

- **Sprint 8.1 — iOS build pipeline.** Apple Developer account, signing certs, App Store Connect entry; `flutter build ipa`; TestFlight beta.
- **Sprint 8.2 — Android build pipeline.** Google Play Console entry, signing key; `flutter build appbundle`; internal testing track.
- **Sprint 8.3 — Mobile-specific UX polish.** Tap targets, gesture handling, native-feel transitions, iPad/tablet layout breakpoints. Push notifications via Firebase Messaging if not already wired.

Native iOS Swift and native Android Kotlin are **not** built — the same Flutter codebase serves all three platforms. This is the major win of the Flutter pivot.

---

## Phase 9 — Migrate landing page to Flutter

> Final stack-unification step. Begins **only after Phase 8** — by this point all app development has concluded, the Flutter design system is mature, and the React landing page has served its purpose.

- **Sprint 9.1 — Port landing components to Flutter.** Recreate `Navbar`, `Hero`, `ProblemSection`, `FeaturesSection`, `Footer` as Flutter widgets using `shared_ui` tokens. Preserve content, layout, and the Google-Forms waitlist CTA. Build to a third Flutter web target.
- **Sprint 9.2 — SEO, performance, cutover.** Flutter Web defaults are weak for marketing pages. Address: meta tags + Open Graph in `web/index.html`, prerendered first paint or HTML renderer for the landing only, Lighthouse performance audit. Cut DNS over from React build to Flutter build. Archive `web/` (React) under `web-react-archive/` for reference.

After Phase 9, the entire frontend (landing, app, admin, mobile) runs on a single Flutter codebase.

---

## Critical files & references

### To read at the start of each sprint

- `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/Features/Departments/Attendant/` — feature reference
- `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/Core/Theme/AppTheme.swift` — design tokens source of truth
- `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/GraphQL/` — schema reference
- `docs/architecture/` — accumulated decisions

### To be created in this plan

**Roadmap & per-sprint plans** (`docs/development_plans/`):

- `00-roadmap.md` — this file, kept up to date as sprints close
- `phase-1-foundations.md` — sprint-by-sprint plan for Phase 1
- `phase-2a-attendants-overseer.md` — sprint-by-sprint plan for Phase 2A
- `phase-2b-attendants-volunteer.md` — sprint-by-sprint plan for Phase 2B
- ...one phase plan per phase

**Technical decision docs** (`docs/architecture/`):

- `01-monorepo-layout.md` (closes during Sprint 1.1)
- `02-design-system.md` (closes during Sprint 1.2)
- `03-auth-and-roles.md` (closes during Sprint 1.3)
- `04-backend-architecture.md` (closes during Sprint 1.4)
- One decision doc per non-trivial sprint thereafter (`05-…`, `06-…`)

### To be modified

- `web/firebase.json` → moved to `firebase.json` at root with three targets (Sprint 1.1)
- `web/.firebaserc` → moved to `.firebaserc` at root (Sprint 1.1)
- `.github/workflows/firebase-hosting-*.yml` — path-aware build, Flutter step for `app/`/`admin/` (Sprint 1.1)
- `.gitignore` — Flutter build/tooling output paths (Sprint 1.1)
- `CLAUDE.md` (project) — pivot to Flutter for `app/`+`admin/`+mobile; SpringBoot + GraphQL + Postgres backend confirmed (Sprint 1.4 closes the loop)

---

## Sprint hygiene (applies to every sprint)

Each sprint follows the Solo Dev Lifecycle in global CLAUDE.md:

1. **Plan** — open a GitHub issue with the sprint name. _what / why / out of scope_.
2. **Define** — list acceptance criteria as a checklist on the issue.
3. **Design** — for non-trivial sprints, append a design note (data model, GraphQL types, widget tree). Save substantive design notes as a numbered file in `docs/architecture/`.
4. **Develop** — branch off `development` named `feat/<sprint-id>-<slug>` (e.g. `feat/2a-1-dashboard-shell`). Commits are small and conventional (`feat(app):`, `feat(backend):`).
5. **Test** — manually verify all acceptance criteria. Logic-heavy code (resolvers, role guards) gets unit tests. Each sprint has at least one integration/widget test once the auth shell exists.
6. **Close** — PR `feat/...` → `development` (`--no-ff`, never squash). Self-review or Claude review. Periodically open a Release PR `development` → `main` to cut a deployment.

---

## Verification (how to know each sprint is real)

A sprint is done when:

- Acceptance criteria are checked on its issue.
- Widgetbook (Sprint 1.2 onwards) has stories for any new shared widgets.
- For Flutter sprints: `flutter analyze` clean + `flutter test` green.
- For backend sprints: `./gradlew test` green (Testcontainers Postgres).
- The relevant page is reachable on the Firebase **preview** channel from the PR, and the reviewer (you or Claude) walks the happy path manually.
- Decision doc(s) in `docs/architecture/` are updated.

End-to-end check after Phase 1: sign in with Google on `app.assemblyops.org` (Flutter Web) → Firebase ID token attached to GraphQL request → SpringBoot on Cloud Run validates → Postgres `users` row resolved → `me` query returns role → Flutter routes to `/overseer/attendants` or `/volunteer`. That's the baseline every later sprint extends.

---

## Open items (to pick up at sprint start, not now)

- Push-notification approach (Firebase Cloud Messaging via Flutter `firebase_messaging`) — wired in whichever department first needs it (likely Attendants Sprint 2A.1 or Phase 8).
- Parking department feature set — needs a design spike (no iOS reference).
- Volunteer self-service signup vs admin-issued invites long-term (currently invite-only).
- Code-generation strategy: do we adopt `freezed` + `json_serializable` for data classes, or roll plain Dart classes? (Decide in Sprint 1.4 when GraphQL types start arriving.)
