import 'package:flutter/material.dart';

/// Corner radius scale. Mode-agnostic.
///
/// Mirrors iOS: badge=8, small=12, button=14, medium=16, large=24, pill=100.
/// `*Radius` getters are pre-built `BorderRadius.circular` helpers.
abstract final class AppRadii {
  AppRadii._();

  static const double badge = 8;
  static const double small = 12;
  static const double button = 14;
  static const double medium = 16;
  static const double large = 24;
  static const double pill = 100;

  static final BorderRadius badgeRadius = BorderRadius.circular(badge);
  static final BorderRadius smallRadius = BorderRadius.circular(small);
  static final BorderRadius buttonRadius = BorderRadius.circular(button);
  static final BorderRadius mediumRadius = BorderRadius.circular(medium);
  static final BorderRadius largeRadius = BorderRadius.circular(large);
  static final BorderRadius pillRadius = BorderRadius.circular(pill);
}
