// Assembles the shared Material ThemeData from the design tokens.

import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_typography.dart';

/// Single source of truth for the AssemblyOps web Material theme.
abstract final class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        surface: AppColors.card,
      ),
      scaffoldBackgroundColor: AppColors.bgTop,
    );
    return base.copyWith(
      textTheme: AppTypography.textTheme(base.textTheme),
      dividerColor: AppColors.divider,
    );
  }
}
