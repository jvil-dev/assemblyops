// Design tokens: color palette ported 1:1 from the web landing global.css.

import 'package:flutter/widgets.dart';

/// Brand, surface, text, and status colors shared across the web apps.
abstract final class AppColors {
  // Brand
  static const Color primary = Color(0xFF1A365D);
  static const Color primaryTint = Color(0xFF2C5282);
  static final Color primaryLight = primary.withValues(alpha: 0.12);

  // Background gradient stops
  static const Color bgTop = Color(0xFFFAF7F2);
  static const Color bgBottom = Color(0xFFF5F0E8);

  // Surfaces
  static const Color card = Color(0xFFFFFFFF);
  static const Color cardSecondary = Color(0xFFFAF8F6);

  // Text
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF727272);
  static const Color textTertiary = Color(0xFF999999);

  // Lines
  static final Color divider = const Color(0xFF000000).withValues(alpha: 0.08);

  // Status
  static const Color statusOk = Color(0xFF22C55E);
  static const Color statusWarn = Color(0xFFF97316);
  static const Color statusError = Color(0xFFEF4444);
}
