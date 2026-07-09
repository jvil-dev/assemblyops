// Features section: heading + three feature cards in a responsive grid
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class FeaturesSection extends StatelessWidget {
  const FeaturesSection({super.key});

  @override
  Widget build(BuildContext context) {
    final compact = context.isCompact;
    final padY = compact
        ? AppSpacing.sectionPadYMobile
        : AppSpacing.sectionPadYWide;

    const cards = <Widget>[
      _FeatureCard(
        title: 'Organized from the first session',
        body:
            'Give every volunteer their assignment, location, and time in'
            ' one place. Volunteers confirm from their phone before the doors '
            "open - so you know who's assigned where, and where you still need coverage.",
      ),
      _FeatureCard(
        title: 'Reach your whole department instantly',
        body:
            'Send updates to individual volunteers, your keymen, or the '
            'whole department with a tap. Push notifications make sure '
            'last-minute changes reach everyone.',
      ),
      _FeatureCard(
        title: 'Delegate to your assistants and keymen',
        body:
            'Give assistant overseers and keymen the access they need in the '
            'app. They handle their part of the department while you keep the '
            'full picture.',
      ),
    ];

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 960),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: padY),
          child: Column(
            children: [
              Text(
                'Made for the work behind the program',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: compact ? 32 : 36,
                  height: 1.2,
                  fontWeight: AppTypography.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 40),
              if (compact)
                Column(
                  children: [
                    cards[0],
                    const SizedBox(height: 20),
                    cards[1],
                    const SizedBox(height: 20),
                    cards[2],
                  ],
                )
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: cards[0]),
                    const SizedBox(width: 20),
                    Expanded(child: cards[1]),
                    const SizedBox(width: 20),
                    Expanded(child: cards[2]),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      borderRadius: AppRadii.large,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: AppTypography.bold,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: TextStyle(
              fontSize: 16,
              height: 1.6,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
