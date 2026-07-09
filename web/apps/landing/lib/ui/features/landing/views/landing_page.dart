// Landing page shell
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import 'package:landing/ui/features/landing/widgets/features.dart';
import 'package:landing/ui/features/landing/widgets/hero.dart';
import 'package:landing/ui/features/landing/widgets/navbar.dart';
import 'package:landing/ui/features/landing/widgets/problem.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.bgTop, AppColors.bgBottom],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: const [
            SingleChildScrollView(
              child: Column(
                children: [
                  HeroSection(),
                  ProblemSection(),
                  FeaturesSection(),
                  // TODO: Footer + final page composition
                ],
              ),
            ),
            Positioned(top: 0, left: 0, right: 0, child: Navbar()),
          ],
        ),
      ),
    );
  }
}
