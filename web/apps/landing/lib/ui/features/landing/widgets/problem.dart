// Problem section
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class ProblemSection extends StatelessWidget {
  const ProblemSection({super.key});

  @override
  Widget build(BuildContext context) {
    final compact = context.isCompact;
    final padY = compact
        ? AppSpacing.sectionPadYMobile
        : AppSpacing.sectionPadYWide;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 960),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: padY),
          child: Column(
            children: [
              Text(
                'One app, five departments',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: compact ? 32 : 36,
                  height: 1.2,
                  fontWeight: AppTypography.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: Text(
                  "Whether you're filling attendant posts across multiple "
                  'sessions, assigning audio operators to mixers, figuring out '
                  "who's running cameras, coordinating stage assignments, or "
                  'organizing parking coverage - the work behind an assembly '
                  "doesn't stop when the program starts. AssemblyOps gives "
                  'every department the tools to schedule volunteers, track '
                  'attendance, and stay coordinated - all from one app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    height: 1.6,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
