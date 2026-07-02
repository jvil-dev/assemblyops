import 'package:flutter/material.dart';

import '../responsive/breakpoints.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

class SectionScaffold extends StatelessWidget {
  const SectionScaffold({
    super.key,
    required this.child,
    this.maxContentWidth = 1120,
  });

  final Widget child;
  final double maxContentWidth;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.bgTop, AppColors.bgBottom],
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final padY = constraints.maxWidth < Breakpoints.compact
              ? AppSpacing.sectionPadYMobile
              : AppSpacing.sectionPadYWide;
          return Padding(
            padding: EdgeInsets.symmetric(vertical: padY, horizontal: 24),
            child: Center(child: child),
          );
        },
      ),
    );
  }
}
