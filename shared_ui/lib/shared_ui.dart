/// Public API of the shared_ui package.
///
/// Tokens, theme, widgets, and behavior wrappers are exported from here
/// so `/app`, `/admin`, and `widgetbook_app` only need a single import:
///
///     import 'package:shared_ui/shared_ui.dart';

library;

// Tokens
export 'tokens/colors.dart';
export 'tokens/spacing.dart';
export 'tokens/radii.dart';
export 'tokens/durations.dart';
export 'tokens/shadows.dart';
export 'tokens/department_colors.dart';
export 'tokens/typography.dart';

// Theme
export 'theme.dart';

// Widgets
export 'widgets/app_card.dart';
export 'widgets/app_button.dart';
export 'widgets/app_badge.dart';
export 'widgets/status_pill.dart';
export 'widgets/expandable_section.dart';
export 'widgets/empty_state.dart';
export 'widgets/page_layout.dart';

// Behaviors
export 'behaviors/app_dialog.dart';
export 'behaviors/app_toast.dart';
