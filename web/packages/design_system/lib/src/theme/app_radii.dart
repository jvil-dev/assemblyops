// Design tokens: corner radius scale ported 1:1 from global.css.

import 'package:flutter/widgets.dart';

/// Corner radii for cards, buttons, and badges.
abstract final class AppRadii {
  static const double lg = 24;
  static const double md = 16;
  static const double btn = 14;
  static const double sm = 12;
  static const double badge = 8;

  static const BorderRadius card = BorderRadius.all(Radius.circular(md));
  static const BorderRadius button = BorderRadius.all(Radius.circular(btn));
}
