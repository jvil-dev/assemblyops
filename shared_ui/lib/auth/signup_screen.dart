import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens/spacing.dart';
import '../widgets/app_button.dart';
import '../widgets/app_card.dart';
import '../widgets/page_layout.dart';

/// Sign-up screen. New accounts land as Volunteer by default.
///
/// Features:
///   - Email + password registration
///   - Google OAuth
///   - Link to LoginScreen
class SignUpScreen extends StatefulWidget {
  final Future<void> Function() onGoogle;
  final Future<void> Function(String email, String password) onEmailPassword;
  final VoidCallback onSignIn;
  final bool isLoading;
  final String? errorMessage;

  const SignUpScreen({
    super.key,
    required this.onGoogle,
    required this.onEmailPassword,
    required this.onSignIn,
    this.isLoading = false,
    this.errorMessage,
  });

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _emailValid = false;
  bool _passwordValid = false;
  bool _passwordObscured = true;

  bool get _formValid => _emailValid && _passwordValid;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onEmailChanged(String value) {
    final valid = value.contains('@') && value.contains('.');
    if (valid != _emailValid) setState(() => _emailValid = valid);
  }

  void _onPasswordChanged(String value) {
    final valid = value.length >= 8;
    if (valid != _passwordValid) setState(() => _passwordValid = valid);
  }

  void _submit() {
    if (!_formValid || widget.isLoading) return;
    widget.onEmailPassword(
      _emailController.text.trim(),
      _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = theme.extension<AppTokens>()!;
    final canSubmit = _formValid && !widget.isLoading;

    return PageLayout(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Create account', style: theme.textTheme.displaySmall),
              const SizedBox(height: AppSpacing.s),
              Text(
                'Start volunteering with AssemblyOps',
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
                        textInputAction: TextInputAction.next,
                        onChanged: _onEmailChanged,
                        enabled: !widget.isLoading,
                      ),
                      const SizedBox(height: AppSpacing.m),
                      TextField(
                        controller: _passwordController,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          helperText: 'At least 8 characters',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                              () => _passwordObscured = !_passwordObscured,
                            ),
                            icon: Icon(
                              _passwordObscured
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                            tooltip: _passwordObscured ? 'Show' : 'Hide',
                          ),
                        ),
                        obscureText: _passwordObscured,
                        autofillHints: const [AutofillHints.newPassword],
                        textInputAction: TextInputAction.done,
                        onChanged: _onPasswordChanged,
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
                            ? 'Creating…'
                            : 'Create account',
                        onPressed: canSubmit ? _submit : null,
                      ),
                      const SizedBox(height: AppSpacing.l),
                      Row(
                        children: [
                          Expanded(
                            child: Divider(color: tokens.divider, height: 1),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.m,
                            ),
                            child: Text(
                              'or',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: tokens.textTertiary,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Divider(color: tokens.divider, height: 1),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.l),
                      AppButton(
                        label: 'Continue with Google',
                        icon: Icons.g_mobiledata,
                        onPressed: widget.isLoading ? null : widget.onGoogle,
                        kind: AppButtonKind.secondary,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.l),
              Center(
                child: AppButton(
                  label: 'Already have an account? Sign in',
                  onPressed: widget.isLoading ? null : widget.onSignIn,
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
