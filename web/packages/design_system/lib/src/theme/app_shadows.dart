// Design tokens: elevation shadows ported 1:1 from global.css.

import 'package:flutter/widgets.dart';

/// Box shadows for cards and subtle surfaces.
abstract final class AppShadows {
  /// Dual-layer card shadow: 0 8px 20px @0.06 + 0 2px 8px @0.04.
  static final List<BoxShadow> card = [
    BoxShadow(
      offset: const Offset(0, 8),
      blurRadius: 20,
      color: const Color(0xFF000000).withValues(alpha: 0.06),
    ),
    BoxShadow(
      offset: const Offset(0, 2),
      blurRadius: 8,
      color: const Color(0xFF000000).withValues(alpha: 0.04),
    ),
  ];

  /// Subtle single shadow: 0 2px 4px @0.05.
  static final List<BoxShadow> subtle = [
    BoxShadow(
      offset: const Offset(0, 2),
      blurRadius: 4,
      color: const Color(0xFF000000).withValues(alpha: 0.05),
    ),
  ];
}
