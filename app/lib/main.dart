import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:shared_ui/shared_ui.dart';

import 'auth/firebase_init.dart';
import 'auth/router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();
  await initializeFirebase();
  runApp(const ProviderScope(child: AssemblyOpsApp()));
}

/// AssemblyOps root widget. Renders an auth-gated MaterialApp.router.
class AssemblyOpsApp extends ConsumerWidget {
  const AssemblyOpsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'AssemblyOps',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
