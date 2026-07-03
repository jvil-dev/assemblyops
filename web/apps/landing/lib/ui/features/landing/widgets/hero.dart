import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  // TODO: Add URL when available in future issue
  static final Uri _waitlistUrl = Uri.parse('');

  Future<void> _openWaitlist() async {
    final launched = await launchUrl(_waitlistUrl, webOnlyWindowName: '_blank');
    if (!launched) {
      // TODO: surface an error to the user
    }
  }

  @override
  Widget build(BuildContext context) {
    final compact = context.isCompact;
    final minHeight = MediaQuery.sizeOf(context).height * 0.8;

    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 960, minHeight: minHeight),
        child: IntrinsicHeight(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                const SizedBox(height: 120),
                const Spacer(),
                const _HeroBadge(),
                const SizedBox(height: 20),
                Text(
                  'Assembly management,\nsimplified',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: compact ? 40 : 52,
                    height: 1.2,
                    fontWeight: AppTypography.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 16),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: Text(
                    'The all-in-one platform for organizing departments, '
                    'assigning volunteers, and tracking attendance at '
                    'assemblies and conventions.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: compact ? 18 : 20,
                      height: 1.6,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                AppPrimaryButton(
                  label: 'Join the waitlist',
                  onPressed: _openWaitlist,
                ),
                const Spacer(),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroBadge extends StatelessWidget {
  const _HeroBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(100),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Text(
        'LAUNCHING SPRING 2027',
        style: TextStyle(
          fontSize: 12,
          fontWeight: AppTypography.bold,
          letterSpacing: 12 * 0.08,
          color: AppColors.primary,
        ),
      ),
    );
  }
}
