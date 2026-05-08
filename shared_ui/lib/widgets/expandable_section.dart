import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens/durations.dart';
import '../tokens/spacing.dart';

/// Expandable section with a tappable header and an animated body.
///
/// The chevron rotates 0→90° on expand using `AppDurations.quick`. The body
/// animates open/closed via [AnimatedSize]. Used for collapsible reference
/// material (e.g., the CO-23 attendant info guide).
class ExpandableSection extends StatefulWidget {
  final String title;
  final Widget child;
  final IconData? leadingIcon;
  final Color? leadingIconColor;
  final bool initiallyExpanded;

  const ExpandableSection({
    super.key,
    required this.title,
    required this.child,
    this.leadingIcon,
    this.leadingIconColor,
    this.initiallyExpanded = false,
  });

  @override
  State<ExpandableSection> createState() => _ExpandableSectionState();
}

class _ExpandableSectionState extends State<ExpandableSection> {
  late bool _expanded = widget.initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = theme.extension<AppTokens>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.m),
            child: Row(
              children: [
                if (widget.leadingIcon != null) ...[
                  Icon(
                    widget.leadingIcon,
                    size: 18,
                    color: widget.leadingIconColor ?? theme.colorScheme.primary,
                  ),
                  const SizedBox(width: AppSpacing.s),
                ],
                Expanded(
                  child: Text(widget.title, style: theme.textTheme.titleMedium),
                ),
                AnimatedRotation(
                  turns: _expanded ? 0.25 : 0, // 90°
                  duration: AppDurations.quick,
                  curve: Curves.easeInOut,
                  child: Icon(Icons.chevron_right, color: tokens.textTertiary),
                ),
              ],
            ),
          ),
        ),
        AnimatedSize(
          duration: AppDurations.quick,
          curve: Curves.easeInOut,
          alignment: Alignment.topCenter,
          child: _expanded
              ? Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.m),
                  child: widget.child,
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}
