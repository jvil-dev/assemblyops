/// Spacing scale in logical pixels. Mode-agnostic.
///
/// Values: xs=4, s=8, m=12, l=16, xl=24, xxl=32.
/// `screenEdge` for page horizontal padding; `cardPadding` for `AppCard`.
abstract final class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double s = 8;
  static const double m = 12;
  static const double l = 16;
  static const double xl = 24;
  static const double xxl = 32;

  static const double screenEdge = 20;
  static const double cardPadding = 20;
}
