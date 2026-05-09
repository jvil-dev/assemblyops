import 'package:flutter/material.dart';
import 'package:shared_ui/shared_ui.dart';

void main() => runApp(const AssemblyOpsAdminApp());

/// AssemblyOps Admin entry point. Bootstrap home renders the design system
/// smoke screen.
class AssemblyOpsAdminApp extends StatelessWidget {
  const AssemblyOpsAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AssemblyOps Admin',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      home: const _HelloDesignSystem(),
    );
  }
}

/// Bootstrap home — temporary smoke screen confirming `shared_ui` is wired
/// for the admin portal. Sprint 7 fills this in with monitoring + billing.
class _HelloDesignSystem extends StatelessWidget {
  const _HelloDesignSystem();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: PageLayout(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'AssemblyOps Admin',
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: AppSpacing.l),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Design system wired ✓',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: AppSpacing.s),
                  Text(
                    'Admin portal shell. Sprint 7 adds monitoring + billing.',
                    style: Theme.of(context).textTheme.bodyMedium,
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
