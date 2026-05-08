import 'package:flutter/material.dart';

/// Shadow stacks for cards and other floating surfaces.
///
/// `card` is the dual-layer chrome used by `AppCard`: a 6%-opacity black drop
/// (20px blur, 8px below) + a 4%-opacity halo (8px blur, 2px below). Together
/// they read as a subtle, lifted card.
///
/// `subtle` is a single-layer shadow for nested elements (card-within-card).
abstract final class AppShadows {
  AppShadows._();

  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x0F000000), // black 6%
      blurRadius: 20,
      offset: Offset(0, 8),
    ),
    BoxShadow(
      color: Color(0x0A000000), // black 4%
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  static const List<BoxShadow> subtle = [
    BoxShadow(
      color: Color(0x0D000000), // black 5%
      blurRadius: 4,
      offset: Offset(0, 2),
    ),
  ];
}
