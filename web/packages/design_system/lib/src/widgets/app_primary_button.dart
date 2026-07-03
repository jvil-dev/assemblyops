import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radii.dart';
import '../theme/app_typography.dart';

class AppPrimaryButton extends StatelessWidget {
  const AppPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.labelLarge?.copyWith(
      fontSize: 16,
      fontWeight: AppTypography.medium,
    );
    return FilledButton(
      onPressed: onPressed,
      style:
          FilledButton.styleFrom(
            shape: const RoundedRectangleBorder(borderRadius: AppRadii.button),
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
            textStyle: labelStyle,
          ).copyWith(
            foregroundColor: WidgetStateColor.resolveWith((states) {
              if (states.contains(WidgetState.disabled)) {
                return AppColors.card.withValues(alpha: 0.7);
              }
              return AppColors.card;
            }),
            backgroundColor: WidgetStateColor.resolveWith((states) {
              if (states.contains(WidgetState.disabled)) {
                return AppColors.primary.withValues(alpha: 0.4);
              }
              if (states.contains(WidgetState.hovered)) {
                return AppColors.primaryTint;
              }
              return AppColors.primary;
            }),
            overlayColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.pressed) ||
                  states.contains(WidgetState.focused)) {
                return AppColors.card.withValues(alpha: 0.12);
              }
              return Colors.transparent;
            }),
          ),
      child: Text(label),
    );
  }
}
