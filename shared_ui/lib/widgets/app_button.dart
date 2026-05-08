import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/durations.dart';
import '../tokens/radii.dart';
import '../tokens/spacing.dart';

/// Visual variant of [AppButton].
enum AppButtonKind {
  /// Filled brand color, white text.
  primary,

  /// Brand-colored outline, brand text.
  secondary,

  /// No background or border, brand text. Used for inline actions.
  ghost,

  /// Filled red (declined status), white text. Use for destructive actions.
  destructive,
}

/// Primary interactive button.
///
/// Scale-press feedback (0.97 over 150ms) on tap. Pass `onPressed: null` to
/// render a disabled (45% opacity, non-interactive) button.
class AppButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonKind kind;
  final IconData? icon;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.kind = AppButtonKind.primary,
    this.icon,
  });

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final disabled = widget.onPressed == null;

    final (Color fg, Color? bg, Color? border) = switch (widget.kind) {
      AppButtonKind.primary => (colors.onPrimary, colors.primary, null),
      AppButtonKind.secondary => (colors.primary, null, colors.primary),
      AppButtonKind.ghost => (colors.primary, null, null),
      AppButtonKind.destructive => (Colors.white, AppColors.declined, null),
    };

    return GestureDetector(
      onTap: disabled ? null : widget.onPressed,
      onTapDown: disabled ? null : (_) => _setPressed(true),
      onTapUp: disabled ? null : (_) => _setPressed(false),
      onTapCancel: disabled ? null : () => _setPressed(false),
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
        duration: AppDurations.pressFeedback,
        curve: Curves.easeInOut,
        child: Opacity(
          opacity: disabled ? 0.45 : 1.0,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.l,
              vertical: AppSpacing.m,
            ),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: AppRadii.buttonRadius,
              border: border != null
                  ? Border.all(color: border, width: 1.5)
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.icon != null) ...[
                  Icon(widget.icon, size: 18, color: fg),
                  const SizedBox(width: AppSpacing.s),
                ],
                Text(
                  widget.label,
                  style: theme.textTheme.titleMedium?.copyWith(color: fg),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
