import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens/spacing.dart';
import '../widgets/app_button.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/page_layout.dart';

/// Forgot-password flow.
///
/// States:
///   - Initial: email field + send button
///   - Sent: confirmation message (parent flips `isSent`)
class ForgotPasswordScreen extends StatefulWidget {
  final Future<void> Function(String email) onSendReset;
  final VoidCallback onBack;
  final bool isSent;
  final bool isLoading;
  final String? errorMessage;

  const ForgotPasswordScreen({
    super.key,
    required this.onSendReset,
    required this.onBack,
    this.isSent = false,
    this.isLoading = false,
    this.errorMessage,
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _emailValid = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _onEmailChanged(String value) {
    final valid = value.contains('@') && value.contains('.');
    if (valid != _emailValid) setState(() => _emailValid = valid);
  }

  void _submit() {
    if (!_emailValid || widget.isLoading) return;
    widget.onSendReset(_emailController.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = theme.extension<AppTokens>()!;

    if (widget.isSent) {
      return PageLayout(
        scrollable: false,
        child: EmptyState(
          icon: Icons.mark_email_read_outlined,
          title: 'Check your inbox',
          message:
              "If an account exists for that address, we sent a "
              "password-reset link. The link expires in 1 hour.",
          action: AppButton(label: 'Back to sign in', onPressed: widget.onBack),
        ),
      );
    }

    return PageLayout(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Reset your password', style: theme.textTheme.headlineSmall),
              const SizedBox(height: AppSpacing.s),
              Text(
                "Enter your account email and we'll send you a reset link.",
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: tokens.textTertiary,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AppCard(
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _emailController,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.alternate_email),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        textInputAction: TextInputAction.done,
                        onChanged: _onEmailChanged,
                        onSubmitted: (_) => _submit(),
                        enabled: !widget.isLoading,
                      ),
                      if (widget.errorMessage != null) ...[
                        const SizedBox(height: AppSpacing.m),
                        Text(
                          widget.errorMessage!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.error,
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.l),
                      AppButton(
                        label: widget.isLoading
                            ? 'Sending…'
                            : 'Send reset link',
                        onPressed: (_emailValid && !widget.isLoading)
                            ? _submit
                            : null,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.l),
              Center(
                child: AppButton(
                  label: 'Back to sign in',
                  onPressed: widget.onBack,
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
