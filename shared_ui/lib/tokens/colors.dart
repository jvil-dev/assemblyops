import 'package:flutter/material.dart';

/// Color tokens for the design system.
///
/// Pure const light + dark variants. Mode-aware access via `AppTokens`
/// (see `theme.dart`).
abstract final class AppColors {
  AppColors._();

  // --- Page backgrounds (top + bottom gradient stops) ---
  static const pageBackgroundTopLight = Color(0xFFFAF7F2);
  static const pageBackgroundTopDark = Color(0xFF1A1A1A);
  static const pageBackgroundBottomLight = Color(0xFFF5F0E8);
  static const pageBackgroundBottomDark = Color(0xFF141414);

  // --- Surfaces ---
  static const surfaceLight = Color(0xFFFFFFFF);
  static const surfaceDark = Color(0xFF262626);
  static const surfaceSecondaryLight = Color(0xFFFAF8F5);
  static const surfaceSecondaryDark = Color(0xFF1F1F1F);

  // --- Text ---
  static const textPrimaryLight = Color(0xFF1A1A1A);
  static const textPrimaryDark = Color(0xFFFFFFFF);
  static const textSecondaryLight = Color(0xFF737373);
  static const textSecondaryDark = Color(0x99FFFFFF); // white 60%
  static const textTertiaryLight = Color(0xFF999999);
  static const textTertiaryDark = Color(0x66FFFFFF); // white 40%

  // --- Dividers ---
  static const dividerLight = Color(0x14000000); // black 8%
  static const dividerDark = Color(0x1AFFFFFF); // white 10%

  // --- Brand accent (primary actions, tinted icons) ---
  static const brandAccentLight = Color(0xFF1A365D);
  static const brandAccentDark = Color(0xFF2C5282);

  // --- Status (mode-agnostic; iOS uses SwiftUI system colors here) ---
  static const pending = Color(0xFFFF9800); // orange
  static const accepted = Color(0xFF4CAF50); // green
  static const declined = Color(0xFFF44336); // red
  static const info = Color(0xFF2196F3); // blue
  static const warning = Color(0xFFFF9800); // same as pending

  /// Status background (12% opacity over the status color).
  static Color statusBackground(Color status) => status.withValues(alpha: 0.12);

  /// Subtle status background (6% opacity).
  static Color statusBackgroundSubtle(Color status) =>
      status.withValues(alpha: 0.06);
}
