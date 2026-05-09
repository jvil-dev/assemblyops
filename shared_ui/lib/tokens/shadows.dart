import 'package:flutter/material.dart';

/// Shadow stacks for cards and other floating surfaces.
///
/// `card` is the dual-layer chrome used by `AppCard`: 6% black drop
/// (20px blur, 8px below) + 4% halo (8px blur, 2px below).
/// `subtle` is a single-layer shadow for nested elements.
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
