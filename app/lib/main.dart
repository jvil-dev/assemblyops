import 'package:flutter/material.dart';
import 'package:shared_ui/shared_ui.dart';

void main() => runApp(const AssemblyOpsApp());

class AssemblyOpsApp extends StatelessWidget {
  const AssemblyOpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AssemblyOps',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      home: const _HelloDesignSystem(),
    );
  }
}

/// Bootstrap home — temporary smoke screen confirming `shared_ui` is wired.
/// Replaced in Sprint 1.3 with the auth shell + login/role routing.
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
              'AssemblyOps',
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
                    'Sprint 1.2 baseline. Sprint 1.3 replaces this with the '
                    'auth shell.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.m),
                  Row(
                    children: [
                      AppBadge(
                        label: DepartmentTheme.nameFor(Department.attendant),
                        color: DepartmentTheme.colorFor(Department.attendant),
                      ),
                      const SizedBox(width: AppSpacing.s),
                      const StatusPill(
                        label: 'Pending',
                        kind: StatusPillKind.pending,
                      ),
                    ],
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
