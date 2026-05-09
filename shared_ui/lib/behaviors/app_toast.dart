import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/radii.dart';
import '../tokens/spacing.dart';

/// Visual variant of [showAppToast].
enum AppToastKind { info, success, warning, error }

/// Shows a Material SnackBar with AssemblyOps chrome.
///
/// Features:
///   - Floating, status-colored bar with leading icon
///   - Auto-dismiss after Material default (~4s)
///   - Returns [ScaffoldFeatureController] for manual dismiss or await close
ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showAppToast(
  BuildContext context, {
  required String message,
  AppToastKind kind = AppToastKind.info,
}) {
  final (Color color, IconData icon) = switch (kind) {
    AppToastKind.info => (AppColors.info, Icons.info_outline),
    AppToastKind.success => (AppColors.accepted, Icons.check_circle_outline),
    AppToastKind.warning => (AppColors.warning, Icons.warning_amber_outlined),
    AppToastKind.error => (AppColors.declined, Icons.error_outline),
  };

  return ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      backgroundColor: color,
      shape: RoundedRectangleBorder(borderRadius: AppRadii.smallRadius),
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.all(AppSpacing.l),
      content: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: AppSpacing.s),
          Expanded(
            child: Text(message, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    ),
  );
}
