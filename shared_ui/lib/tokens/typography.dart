import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography scale for the design system.
///
/// DM Sans for everything except `monospaced` (Roboto Mono).
/// `textTheme(Color)` maps onto Material's slots.
abstract final class AppTypography {
  AppTypography._();

  static TextStyle get largeTitle =>
      GoogleFonts.dmSans(fontSize: 28, fontWeight: FontWeight.w600);
  static TextStyle get title =>
      GoogleFonts.dmSans(fontSize: 22, fontWeight: FontWeight.w600);
  static TextStyle get headline =>
      GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w600);
  static TextStyle get body =>
      GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w400);
  static TextStyle get bodyMedium =>
      GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w500);
  static TextStyle get subheadline =>
      GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w400);
  static TextStyle get caption =>
      GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w400);
  static TextStyle get captionBold =>
      GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500);
  static TextStyle get smallCaption =>
      GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w400);
  static TextStyle get monospaced =>
      GoogleFonts.robotoMono(fontSize: 15, fontWeight: FontWeight.w400);

  /// Builds a Material `TextTheme` from the iOS scale, applying [textColor]
  /// to every slot. Mappings:
  ///   displaySmall  ← largeTitle (28sb)
  ///   headlineSmall ← title (22sb)
  ///   titleMedium   ← headline (17sb)
  ///   bodyLarge     ← body (17r)
  ///   bodyMedium    ← subheadline (15r)
  ///   bodySmall     ← caption (13r)
  ///   labelMedium   ← captionBold (13m)
  ///   labelSmall    ← smallCaption (11r)
  static TextTheme textTheme(Color textColor) => TextTheme(
    displaySmall: largeTitle.copyWith(color: textColor),
    headlineSmall: title.copyWith(color: textColor),
    titleMedium: headline.copyWith(color: textColor),
    bodyLarge: body.copyWith(color: textColor),
    bodyMedium: subheadline.copyWith(color: textColor),
    bodySmall: caption.copyWith(color: textColor),
    labelMedium: captionBold.copyWith(color: textColor),
    labelSmall: smallCaption.copyWith(color: textColor),
  );
}
