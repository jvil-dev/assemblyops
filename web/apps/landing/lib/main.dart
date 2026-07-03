// AssemblyOps landing - app entry point
// Boots the MaterialApp with the shared theme; the page shell lives under ui/features/landing
import 'package:flutter/material.dart';
import 'package:design_system/design_system.dart';

import 'ui/features/landing/views/landing_page.dart';

void main() => runApp(const LandingApp());

class LandingApp extends StatelessWidget {
  const LandingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AssemblyOps',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const LandingPage(),
    );
  }
}
