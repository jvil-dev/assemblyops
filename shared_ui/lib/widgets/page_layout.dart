import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens/spacing.dart';

/// Standard page wrapper.
///
/// Renders a vertical gradient background, 20pt horizontal padding, and a
/// scroll view. Pass `scrollable: false` for layouts that manage their own
/// scrolling.
class PageLayout extends StatelessWidget {
  final Widget child;
  final bool scrollable;
  final EdgeInsetsGeometry? padding;

  const PageLayout({
    super.key,
    required this.child,
    this.scrollable = true,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = Theme.of(context).extension<AppTokens>()!;
    final effectivePadding =
        padding ??
        const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenEdge,
          vertical: AppSpacing.l,
        );

    final body = Padding(padding: effectivePadding, child: child);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [tokens.pageBackgroundTop, tokens.pageBackgroundBottom],
        ),
      ),
      child: SafeArea(
        child: scrollable ? SingleChildScrollView(child: body) : body,
      ),
    );
  }
}
