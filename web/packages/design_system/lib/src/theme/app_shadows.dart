// Design tokens: elevation shadows ported 1:1 from global.css.

import 'package:flutter/widgets.dart';

/// Box shadows for cards and subtle surfaces.
abstract final class AppShadows {
  static const List<BoxShadow> card = [
    BoxShadow(
      offset: Offset(0, 8),
      blurRadius: 20,
      color: Color.from(alpha: 0.06, red: 0, green: 0, blue: 0),
    ),
    BoxShadow(
      offset: Offset(0, 2),
      blurRadius: 8,
      color: Color.from(alpha: 0.04, red: 0, green: 0, blue: 0),
    ),
  ];

  static const List<BoxShadow> subtle = [
    BoxShadow(
      offset: Offset(0, 2),
      blurRadius: 4,
      color: Color.from(alpha: 0.05, red: 0, green: 0, blue: 0),
    ),
  ];
}
