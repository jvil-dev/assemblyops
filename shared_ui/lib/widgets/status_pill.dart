import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/radii.dart';
import '../tokens/spacing.dart';

/// Status of an item (assignment, action, alert, etc.).
enum StatusPillKind { pending, accepted, declined, info, success, warning }

/// Pill-shaped chip with a colored dot + label.
///
/// The dot uses the solid status color; the pill background renders at 12%
/// opacity. Use to surface the state of an item (assignment status, alert
/// resolution, etc.).
class StatusPill extends StatelessWidget {
  final String label;
  final StatusPillKind kind;

  const StatusPill({super.key, required this.label, required this.kind});

  Color get _color => switch (kind) {
    StatusPillKind.pending => AppColors.pending,
    StatusPillKind.accepted => AppColors.accepted,
    StatusPillKind.declined => AppColors.declined,
    StatusPillKind.info => AppColors.info,
    StatusPillKind.success => AppColors.accepted,
    StatusPillKind.warning => AppColors.warning,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.m,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.statusBackground(_color),
        borderRadius: AppRadii.pillRadius,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: _color, shape: BoxShape.circle),
          ),
          const SizedBox(width: AppSpacing.s),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: _color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
