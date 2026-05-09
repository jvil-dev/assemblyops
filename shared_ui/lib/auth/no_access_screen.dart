import 'package:flutter/material.dart';

import '../widgets/app_button.dart';
import '../widgets/empty_state.dart';
import '../widgets/page_layout.dart';

/// Rejection screen for non-admin users on admin.assemblyops.org.
/// Renders sign-out button and link to /app.
class NoAccessScreen extends StatelessWidget {
  final VoidCallback onSignOut;

  const NoAccessScreen({super.key, required this.onSignOut});

  @override
  Widget build(BuildContext context) {
    return PageLayout(
      scrollable: false,
      child: EmptyState(
        icon: Icons.lock_outline,
        title: 'No admin access',
        message:
            "This portal is for AssemblyOps administrators only. "
            "Sign out and head to app.assemblyops.org if you're a volunteer.",
        action: AppButton(label: 'Sign out', onPressed: onSignOut),
      ),
    );
  }
}
