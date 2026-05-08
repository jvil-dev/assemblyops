import 'package:flutter/material.dart';

import '../tokens/radii.dart';
import '../tokens/spacing.dart';

/// Shows a Material dialog with AssemblyOps chrome.
///
/// Wraps [showDialog] with our card surface (large radius, 24pt padding).
/// `builder` receives the dialog [BuildContext]; return your dialog body
/// (typically a Column with a title, content, and action buttons).
Future<T?> showAppDialog<T>({
  required BuildContext context,
  required Widget Function(BuildContext) builder,
  bool barrierDismissible = true,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    builder: (context) {
      return Dialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadii.largeRadius),
        insetPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.l,
          vertical: AppSpacing.xxl,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: builder(context),
        ),
      );
    },
  );
}
