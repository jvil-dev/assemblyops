/// Animation durations used across the design system.
///
/// Curves are imported per-widget from `package:flutter/animation.dart`
/// (typically `Curves.easeInOut` for `quick`, `Curves.easeOut` for
/// `standard`).
abstract final class AppDurations {
  AppDurations._();

  /// 200ms — toggle, chevron rotation, state change.
  static const Duration quick = Duration(milliseconds: 200);

  /// 500ms — entrance, fade-in.
  static const Duration standard = Duration(milliseconds: 500);

  /// 150ms — scale-press feedback on tappable surfaces.
  static const Duration pressFeedback = Duration(milliseconds: 150);
}
