import 'package:flutter/widgets.dart';

abstract final class Breakpoints {
  static const double compact = 640;
}

extension ResponsiveContext on BuildContext {
  bool get isCompact => MediaQuery.sizeOf(this).width < Breakpoints.compact;
  bool get isWide => !isCompact;
}
