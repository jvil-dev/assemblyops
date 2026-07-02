// Widget tests for the design_system base widgets.

import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppPrimaryButton', () {
    testWidgets('renders label and fires onPressed', (tester) async {
      var tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppPrimaryButton(
              label: 'Continue',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Continue'), findsOneWidget);

      await tester.tap(find.byType(AppPrimaryButton));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('is disabled when onPressed is null', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: AppPrimaryButton(label: 'Off', onPressed: null)),
        ),
      );

      final button = tester.widget<FilledButton>(find.byType(FilledButton));
      expect(button.onPressed, isNull);
    });
  });

  group('AppCard', () {
    testWidgets('renders its child with the card color and radius', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: AppCard(child: Text('Body'))),
        ),
      );

      expect(find.text('Body'), findsOneWidget);

      final decorated = tester.widget<DecoratedBox>(
        find
            .descendant(
              of: find.byType(AppCard),
              matching: find.byType(DecoratedBox),
            )
            .first,
      );
      final decoration = decorated.decoration as BoxDecoration;
      expect(decoration.color, AppColors.card);
      expect(decoration.borderRadius, AppRadii.card);
    });
  });

  group('SectionScaffold', () {
    Future<void> pumpAtWidth(WidgetTester tester, double width) async {
      tester.view.physicalSize = Size(width, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        const MaterialApp(home: SectionScaffold(child: Text('Section'))),
      );
    }

    bool hasVerticalPadding(WidgetTester tester, double top) {
      return tester
          .widgetList<Padding>(
            find.descendant(
              of: find.byType(SectionScaffold),
              matching: find.byType(Padding),
            ),
          )
          .any(
            (p) =>
                p.padding is EdgeInsets && (p.padding as EdgeInsets).top == top,
          );
    }

    testWidgets('uses wide padding at >= 640 width', (tester) async {
      await pumpAtWidth(tester, 1000);
      expect(find.text('Section'), findsOneWidget);
      expect(hasVerticalPadding(tester, AppSpacing.sectionPadYWide), isTrue);
    });

    testWidgets('uses mobile padding below 640 width', (tester) async {
      await pumpAtWidth(tester, 500);
      expect(hasVerticalPadding(tester, AppSpacing.sectionPadYMobile), isTrue);
    });

    testWidgets('caps child width at maxContentWidth on wide viewports', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(2000, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        const MaterialApp(
          home: SectionScaffold(
            child: SizedBox(
              key: Key('content'),
              width: double.infinity,
              height: 10,
            ),
          ),
        ),
      );

      expect(tester.getSize(find.byKey(const Key('content'))).width, 1120);
    });
  });
}
