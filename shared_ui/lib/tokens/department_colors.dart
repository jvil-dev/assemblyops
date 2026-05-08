import 'package:flutter/material.dart';

/// The five core volunteer departments for v1.
enum Department { attendant, audio, video, stage, parking }

/// Department color theming.
///
/// Each department has an accent color used for icons, status chips, and
/// dashboard tile tinting. Mode-agnostic — the same color works in light and
/// dark modes (matches iOS `DepartmentColors.swift` asset definitions).
abstract final class DepartmentTheme {
  DepartmentTheme._();

  static const Color _attendant = Color(0xFFF97316); // orange
  static const Color _audio = Color(0xFF0EA68C); // blue-green
  static const Color _video = Color(0xFF30AA8A); // teal
  static const Color _stage = Color(0xFF8E52D1); // purple
  static const Color _parking = Color(0xFFF5C400); // yellow

  /// Solid accent color for the given department.
  static Color colorFor(Department d) => switch (d) {
    Department.attendant => _attendant,
    Department.audio => _audio,
    Department.video => _video,
    Department.stage => _stage,
    Department.parking => _parking,
  };

  /// 15%-opacity tint, used for icon backgrounds and muted chips.
  static Color tintFor(Department d) => colorFor(d).withValues(alpha: 0.15);

  /// Human-readable department name.
  static String nameFor(Department d) => switch (d) {
    Department.attendant => 'Attendants',
    Department.audio => 'Audio',
    Department.video => 'Video',
    Department.stage => 'Stage',
    Department.parking => 'Parking',
  };
}
