// Design tokens: DM Sans typography via google_fonts.

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// DM Sans weights and the shared text theme (400/500/600/700).
abstract final class AppTypography {
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semibold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;

  /// DM Sans applied over [base], tinted with the primary text color.
  static TextTheme textTheme(TextTheme base) =>
      GoogleFonts.dmSansTextTheme(base).apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
      );
}
