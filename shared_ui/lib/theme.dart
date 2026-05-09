import 'package:flutter/material.dart';

import 'tokens/colors.dart';
import 'tokens/radii.dart';
import 'tokens/typography.dart';

/// Mode-aware design tokens that don't fit Material's `ColorScheme`.
///
/// Usage:
/// ```dart
/// final tokens = Theme.of(context).extension<AppTokens>()!;
/// ```
@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  final Color pageBackgroundTop;
  final Color pageBackgroundBottom;
  final Color surfaceSecondary;
  final Color textTertiary;
  final Color divider;

  const AppTokens({
    required this.pageBackgroundTop,
    required this.pageBackgroundBottom,
    required this.surfaceSecondary,
    required this.textTertiary,
    required this.divider,
  });

  /// Light-mode preset.
  static const light = AppTokens(
    pageBackgroundTop: AppColors.pageBackgroundTopLight,
    pageBackgroundBottom: AppColors.pageBackgroundBottomLight,
    surfaceSecondary: AppColors.surfaceSecondaryLight,
    textTertiary: AppColors.textTertiaryLight,
    divider: AppColors.dividerLight,
  );

  /// Dark-mode preset.
  static const dark = AppTokens(
    pageBackgroundTop: AppColors.pageBackgroundTopDark,
    pageBackgroundBottom: AppColors.pageBackgroundBottomDark,
    surfaceSecondary: AppColors.surfaceSecondaryDark,
    textTertiary: AppColors.textTertiaryDark,
    divider: AppColors.dividerDark,
  );

  @override
  AppTokens copyWith({
    Color? pageBackgroundTop,
    Color? pageBackgroundBottom,
    Color? surfaceSecondary,
    Color? textTertiary,
    Color? divider,
  }) => AppTokens(
    pageBackgroundTop: pageBackgroundTop ?? this.pageBackgroundTop,
    pageBackgroundBottom: pageBackgroundBottom ?? this.pageBackgroundBottom,
    surfaceSecondary: surfaceSecondary ?? this.surfaceSecondary,
    textTertiary: textTertiary ?? this.textTertiary,
    divider: divider ?? this.divider,
  );

  @override
  AppTokens lerp(ThemeExtension<AppTokens>? other, double t) {
    if (other is! AppTokens) return this;
    return AppTokens(
      pageBackgroundTop: Color.lerp(
        pageBackgroundTop,
        other.pageBackgroundTop,
        t,
      )!,
      pageBackgroundBottom: Color.lerp(
        pageBackgroundBottom,
        other.pageBackgroundBottom,
        t,
      )!,
      surfaceSecondary: Color.lerp(
        surfaceSecondary,
        other.surfaceSecondary,
        t,
      )!,
      textTertiary: Color.lerp(textTertiary, other.textTertiary, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
    );
  }
}

/// Material `ThemeData` factories for light and dark modes.
///
/// Usage:
///   theme: AppTheme.light(),
///   darkTheme: AppTheme.dark(),
abstract final class AppTheme {
  AppTheme._();

  static ThemeData light() {
    final scheme =
        ColorScheme.fromSeed(
          seedColor: AppColors.brandAccentLight,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppColors.brandAccentLight,
          onPrimary: Colors.white,
          surface: AppColors.surfaceLight,
          onSurface: AppColors.textPrimaryLight,
          error: AppColors.declined,
          onError: Colors.white,
          outline: AppColors.dividerLight,
        );
    return _build(
      scheme: scheme,
      textColor: AppColors.textPrimaryLight,
      tokens: AppTokens.light,
    );
  }

  static ThemeData dark() {
    final scheme =
        ColorScheme.fromSeed(
          seedColor: AppColors.brandAccentDark,
          brightness: Brightness.dark,
        ).copyWith(
          primary: AppColors.brandAccentDark,
          onPrimary: Colors.white,
          surface: AppColors.surfaceDark,
          onSurface: AppColors.textPrimaryDark,
          error: AppColors.declined,
          onError: Colors.white,
          outline: AppColors.dividerDark,
        );
    return _build(
      scheme: scheme,
      textColor: AppColors.textPrimaryDark,
      tokens: AppTokens.dark,
    );
  }

  static ThemeData _build({
    required ColorScheme scheme,
    required Color textColor,
    required AppTokens tokens,
  }) => ThemeData(
    useMaterial3: true,
    brightness: scheme.brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: scheme.surface,
    textTheme: AppTypography.textTheme(textColor),
    cardTheme: CardThemeData(
      color: scheme.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: AppRadii.mediumRadius),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: AppRadii.buttonRadius),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: AppRadii.buttonRadius),
      ),
    ),
    extensions: [tokens],
  );
}
