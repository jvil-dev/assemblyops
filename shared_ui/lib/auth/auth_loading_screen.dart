import 'package:flutter/material.dart';

import '../widgets/page_layout.dart';

/// Full-screen spinner shown while auth state hydrates on app boot.
class AuthLoadingScreen extends StatelessWidget {
  const AuthLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PageLayout(
      scrollable: false,
      child: Center(child: CircularProgressIndicator()),
    );
  }
}
