# 03 — Design system

|                |                |
| -------------- | -------------- |
| **Status**     | Accepted       |
| **Date**       | 2026-05-08     |
| **Sprint**     | 1.2 (issue #8) |
| **Supersedes** | —              |

## Context

Sprint 1.2 needed to deliver the design system that every department sprint will consume. The iOS reference (`AppTheme.swift` + `DepartmentColors.swift` in the archived JW_AssemblyOps app) provides the source values verbatim — hex codes, spacing scale, typography scale, shadow stacks, per-department accent colors.

The system has to live in `shared_ui/` so `/app` and `/admin` (and eventually the migrated `/web` in Phase 9) consume the same primitives without duplicating anything. Pages should compose pre-themed widgets, not raw `Container`s + `BoxDecoration`s.

## Decision

### Token API — hybrid (consts + ThemeExtension)

Tokens that are mode-agnostic (spacing, radii, durations, department colors, raw color hex values) live as **pure const** classes in `shared_ui/lib/tokens/`. Each is an `abstract final class` with a private constructor; access fields via `AppSpacing.l`, `AppRadii.medium`, etc.

Tokens that are mode-aware (page-background gradient stops, `surfaceSecondary`, tertiary text, divider) live in **`AppTokens`**, a `ThemeExtension<AppTokens>` registered on every `AppTheme.light()` / `AppTheme.dark()` ThemeData:

```dart
final tokens = Theme.of(context).extension<AppTokens>()!;
final muted = tokens.surfaceSecondary;
```

Why hybrid: Material's `ColorScheme` covers most mode-aware needs (surface, primary, error). The custom extension handles values Material doesn't have (gradient stops, tertiary text). Mode-agnostic constants keep simple things simple.

### Widget API conventions

- **Named-constructor params only** — no positional args except `child`/`children` where unambiguous.
- **`Kind` enums for variants** — e.g. `AppButtonKind { primary, secondary, ghost, destructive }`. New variants extend the enum; widget logic uses Dart pattern matching on the enum.
- **`onTap` / `onPressed: null` for non-interactive** — passing null disables the widget. `AppButton` renders disabled state at 45% opacity automatically.
- **Scale-press feedback** is built into `AppButton` and tappable `AppCard` — animates to 0.97x scale on press over `AppDurations.pressFeedback` (150ms ease-in-out).
- **No haptic feedback yet** — iOS reference uses `lightTap()` on toggles. Defer to a haptics layer when we add platform-specific touches in Phase 8.

### Department color usage

```dart
final color = DepartmentTheme.colorFor(Department.attendant); // solid accent
final tint = DepartmentTheme.tintFor(Department.attendant);   // 15% bg
final name = DepartmentTheme.nameFor(Department.attendant);   // 'Attendants'
```

Each department gets a foreground accent and a 15%-opacity tint. Consistent across light + dark modes per iOS asset conventions.

### Animation conventions

| Use case                         | Duration | Curve       | Token                        |
| -------------------------------- | -------- | ----------- | ---------------------------- |
| Toggle / chevron / state change  | 200ms    | ease-in-out | `AppDurations.quick`         |
| Entrance / fade-in               | 500ms    | ease-out    | `AppDurations.standard`      |
| Scale-press on tappable surfaces | 150ms    | ease-in-out | `AppDurations.pressFeedback` |

Staggered list entrances (per-card `index * 0.05s` delay per iOS) are **not** implemented this sprint. Land in Sprint 2A.1 (dashboard) where they're actually consumed.

### Widgetbook

Lives in `shared_ui/widgetbook_app/` as a dedicated Flutter web app (Dart packages can't be `flutter run` directly; this is the cleanest standard). One `WidgetbookComponent` per shared_ui widget; use cases group by visual variant.

```bash
cd shared_ui/widgetbook_app
flutter run -d chrome --web-port=5500
```

Light/dark toggle is in the top toolbar (`ThemeAddon`).

> Chrome blocks **port 5060** (SIP) under its hardcoded "unsafe ports" list — use **5500** (or any other safe port). Updated convention superseding the `02-git-workflow.md` example.

**When adding a new widget to `shared_ui/lib/widgets/`:**

1. Add an export line in `shared_ui/lib/shared_ui.dart`.
2. Add a `WidgetbookComponent` in `shared_ui/widgetbook_app/lib/stories.dart`.

### What gets reused vs. built

- **Wrapped, not reinvented**: `Card`, `ElevatedButton`, `TextButton`, `OutlinedButton`, `Tooltip`, `showDialog`, `ScaffoldMessenger.showSnackBar`, `PopupMenuButton`, `TabBar` / `TabBarView` — all Material primitives we expose under our own chrome (or use directly with our theme).
- **Hand-built on tokens**: `AppCard`, `AppButton`, `AppBadge`, `StatusPill`, `ExpandableSection`, `EmptyState`, `PageLayout`. These live in `shared_ui/lib/widgets/`.
- **Behavior wrappers**: `showAppDialog`, `showAppToast` in `shared_ui/lib/behaviors/`.

## Consequences

**Pros**

- Pages compose `AppCard(child: …)` instead of styling raw `Container`s; consistency is enforced by construction.
- Changing a token (e.g., card radius from 16 to 18) ripples to every consumer instantly.
- Widgetbook gives us a visual review surface independent of any single screen.
- Hybrid token API keeps simple things simple while supporting context-aware lookup where we need it.

**Cons / Sharp edges**

- `AppTokens.light`/`dark` carry only the values we currently need; adding a new mode-aware value means editing the extension's `copyWith` / `lerp` / preset constants in tandem.
- Material's `CardThemeData` API surface has churned across Flutter versions; if a future release renames or moves it, our `theme.dart` will need a small update.
- `withValues(alpha: …)` requires Flutter 3.27+; downgrade to `.withOpacity(...)` if we ever pin to older.
- `AppTypography.monospaced` pulls in Roboto Mono; if we never actually use monospaced text in production, drop that single style + we drop the font load.

## References

- [`docs/development_plans/00-roadmap.md`](../development_plans/00-roadmap.md) — overall plan
- [`docs/development_plans/phase-1-foundations.md`](../development_plans/phase-1-foundations.md) — Phase 1 progress
- [`docs/architecture/01-monorepo-layout.md`](./01-monorepo-layout.md) — repo structure
- [`docs/architecture/02-git-workflow.md`](./02-git-workflow.md) — commit + worktree + TODO conventions
- iOS reference: `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/Core/Theme/AppTheme.swift`
- iOS reference: `/Users/jvil723/Developer/AssemblyOps 2/ios/JW_AssemblyOps/Core/Utils/DepartmentColors.swift`
- Issue #8 — the sprint that produced this ADR
