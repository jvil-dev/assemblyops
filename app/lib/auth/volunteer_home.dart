import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_ui/shared_ui.dart';

import 'auth_providers.dart';

/// Placeholder Volunteer landing page.
///
/// Renders a hello card with the signed-in email and a sign-out button.
class VolunteerHome extends ConsumerWidget {
  const VolunteerHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final email = ref.watch(authStateProvider).value?.email ?? '';

    return Scaffold(
      body: PageLayout(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Welcome', style: Theme.of(context).textTheme.displaySmall),
            const SizedBox(height: AppSpacing.l),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Signed in as $email',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: AppSpacing.s),
                  Text(
                    'Department features coming soon.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.l),
                  AppButton(
                    label: 'Sign out',
                    kind: AppButtonKind.secondary,
                    onPressed: () => ref.read(authActionsProvider).signOut(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
