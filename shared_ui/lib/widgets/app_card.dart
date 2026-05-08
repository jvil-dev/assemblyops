import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens/durations.dart';
import '../tokens/radii.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';

/// Visual variant of [AppCard].
enum AppCardKind {
  /// Primary card — white in light, dark grey in dark. Dual-layer shadow.
  /// Default for most content.
  primary,

  /// Nested card — slightly muted surface, smaller radius, lighter shadow.
  /// Use inside another card.
  secondary,
}

/// Rounded surface used for content blocks throughout the app.
///
/// Default chrome mirrors the iOS card: medium-radius corner, dual-layer
/// shadow, 20pt internal padding. Provide [onTap] for tappable cards
/// (a 0.97 scale-press feedback animates while pressed).
class AppCard extends StatefulWidget {
  final Widget child;
  final AppCardKind kind;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  const AppCard({
    super.key,
    required this.child,
    this.kind = AppCardKind.primary,
    this.padding,
    this.onTap,
  });

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = theme.extension<AppTokens>()!;
    final isPrimary = widget.kind == AppCardKind.primary;

    final card = AnimatedScale(
      scale: _pressed ? 0.97 : 1.0,
      duration: AppDurations.pressFeedback,
      curve: Curves.easeInOut,
      child: Container(
        padding: widget.padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: isPrimary
              ? theme.colorScheme.surface
              : tokens.surfaceSecondary,
          borderRadius: isPrimary
              ? AppRadii.mediumRadius
              : AppRadii.smallRadius,
          boxShadow: isPrimary ? AppShadows.card : AppShadows.subtle,
        ),
        child: widget.child,
      ),
    );

    if (widget.onTap == null) return card;

    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      behavior: HitTestBehavior.opaque,
      child: card,
    );
  }
}
