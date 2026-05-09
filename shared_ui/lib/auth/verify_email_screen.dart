import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens/spacing.dart';
import '../widgets/app_button.dart';
import '../widgets/app_card.dart';
import '../widgets/page_layout.dart';

/// Email verification gate for new email/password signups.
///
/// Actions:
///   - Resend verification email
///   - Check verification status
///   - Sign out
class VerifyEmailScreen extends StatelessWidget {
  final String email;
  final Future<void> Function() onResend;
  final Future<void> Function() onCheckVerified;
  final VoidCallback onSignOut;
  final bool isResending;
  final bool isChecking;
  final String? errorMessage;

  const VerifyEmailScreen({
    super.key,
    required this.email,
    required this.onResend,
    required this.onCheckVerified,
    required this.onSignOut,
    this.isResending = false,
    this.isChecking = false,
    this.errorMessage,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = theme.extension<AppTokens>()!;

    return PageLayout(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(
                Icons.mark_email_unread_outlined,
                size: 56,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: AppSpacing.l),
              Text(
                'Verify your email',
                style: theme.textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.s),
              Text(
                'We sent a verification link to:',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: tokens.textTertiary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                email,
                style: theme.textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Click the link in your inbox, then come back here and tap below.',
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.l),
                    AppButton(
                      label: isChecking ? 'Checking…' : "I clicked the link",
                      onPressed: isChecking ? null : onCheckVerified,
                    ),
                    if (errorMessage != null) ...[
                      const SizedBox(height: AppSpacing.m),
                      Text(
                        errorMessage!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.error,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.l),
              AppButton(
                label: isResending ? 'Sending…' : 'Resend verification email',
                onPressed: isResending ? null : onResend,
                kind: AppButtonKind.secondary,
              ),
              const SizedBox(height: AppSpacing.s),
              Center(
                child: AppButton(
                  label: 'Sign out',
                  onPressed: onSignOut,
                  kind: AppButtonKind.ghost,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
