import 'package:flutter/material.dart';
import 'package:shared_ui/shared_ui.dart';
import 'package:widgetbook/widgetbook.dart';

/// Widgetbook stories for every shared_ui widget.
///
/// One `WidgetbookComponent` per widget; each component groups its
/// `WidgetbookUseCase`s. Folders organize the gallery navigation.

final storyDirectories = <WidgetbookNode>[
  WidgetbookFolder(
    name: 'Primitives',
    children: [_appCard(), _appButton(), _appBadge(), _statusPill()],
  ),
  WidgetbookFolder(
    name: 'Structural',
    children: [_expandableSection(), _emptyState(), _pageLayout()],
  ),
];

WidgetbookComponent _appCard() => WidgetbookComponent(
  name: 'AppCard',
  useCases: [
    WidgetbookUseCase(
      name: 'Primary',
      builder: (c) => _wrap(
        AppCard(
          child: Text('Primary card', style: Theme.of(c).textTheme.bodyLarge),
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'Secondary (nested)',
      builder: (c) => _wrap(
        AppCard(
          kind: AppCardKind.secondary,
          child: Text('Secondary card', style: Theme.of(c).textTheme.bodyLarge),
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'Tappable',
      builder: (c) => _wrap(
        AppCard(
          onTap: () {},
          child: Text(
            'Tap me — scale-press feedback',
            style: Theme.of(c).textTheme.bodyLarge,
          ),
        ),
      ),
    ),
  ],
);

WidgetbookComponent _appButton() => WidgetbookComponent(
  name: 'AppButton',
  useCases: [
    WidgetbookUseCase(
      name: 'Primary',
      builder: (c) => _wrap(AppButton(label: 'Continue', onPressed: () {})),
    ),
    WidgetbookUseCase(
      name: 'Secondary',
      builder: (c) => _wrap(
        AppButton(
          label: 'Cancel',
          onPressed: () {},
          kind: AppButtonKind.secondary,
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'Ghost',
      builder: (c) => _wrap(
        AppButton(label: 'Skip', onPressed: () {}, kind: AppButtonKind.ghost),
      ),
    ),
    WidgetbookUseCase(
      name: 'Destructive',
      builder: (c) => _wrap(
        AppButton(
          label: 'Delete',
          onPressed: () {},
          kind: AppButtonKind.destructive,
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'With icon',
      builder: (c) => _wrap(
        AppButton(label: 'Add volunteer', icon: Icons.add, onPressed: () {}),
      ),
    ),
    WidgetbookUseCase(
      name: 'Disabled',
      builder: (c) =>
          _wrap(const AppButton(label: 'Continue', onPressed: null)),
    ),
  ],
);

WidgetbookComponent _appBadge() => WidgetbookComponent(
  name: 'AppBadge',
  useCases: [
    WidgetbookUseCase(
      name: 'Default (brand)',
      builder: (c) => _wrap(const AppBadge(label: '3')),
    ),
    WidgetbookUseCase(
      name: 'With icon',
      builder: (c) =>
          _wrap(const AppBadge(label: 'New', icon: Icons.fiber_new)),
    ),
    WidgetbookUseCase(
      name: 'Department-tinted (Attendant)',
      builder: (c) => _wrap(
        AppBadge(
          label: 'Attendants',
          color: DepartmentTheme.colorFor(Department.attendant),
        ),
      ),
    ),
  ],
);

WidgetbookComponent _statusPill() => WidgetbookComponent(
  name: 'StatusPill',
  useCases: [
    for (final kind in StatusPillKind.values)
      WidgetbookUseCase(
        name: kind.name,
        builder: (c) => _wrap(StatusPill(label: kind.name, kind: kind)),
      ),
  ],
);

WidgetbookComponent _expandableSection() => WidgetbookComponent(
  name: 'ExpandableSection',
  useCases: [
    WidgetbookUseCase(
      name: 'Collapsed',
      builder: (c) => _wrap(
        AppCard(
          child: ExpandableSection(
            title: 'Safety & Emergencies',
            leadingIcon: Icons.shield_outlined,
            child: Text(
              'Stay calm. Locate the nearest exit. Notify your captain via radio.',
              style: Theme.of(c).textTheme.bodyMedium,
            ),
          ),
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'Initially expanded',
      builder: (c) => _wrap(
        AppCard(
          child: ExpandableSection(
            title: 'General Conduct',
            leadingIcon: Icons.people_outline,
            initiallyExpanded: true,
            child: Text(
              'Greet attendees warmly. Maintain a respectful demeanor.',
              style: Theme.of(c).textTheme.bodyMedium,
            ),
          ),
        ),
      ),
    ),
  ],
);

WidgetbookComponent _emptyState() => WidgetbookComponent(
  name: 'EmptyState',
  useCases: [
    WidgetbookUseCase(
      name: 'Title only',
      builder: (c) => _wrap(
        const EmptyState(
          icon: Icons.inbox_outlined,
          title: 'No incidents reported',
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'With message',
      builder: (c) => _wrap(
        const EmptyState(
          icon: Icons.inbox_outlined,
          title: 'No incidents reported',
          message: 'When volunteers report incidents, they will appear here.',
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'With action',
      builder: (c) => _wrap(
        EmptyState(
          icon: Icons.person_add_outlined,
          title: 'No volunteers yet',
          message: 'Invite the first one to get started.',
          action: AppButton(
            label: 'Invite volunteer',
            onPressed: () {},
            icon: Icons.add,
          ),
        ),
      ),
    ),
  ],
);

WidgetbookComponent _pageLayout() => WidgetbookComponent(
  name: 'PageLayout',
  useCases: [
    WidgetbookUseCase(
      name: 'Single card',
      builder: (c) => PageLayout(
        child: AppCard(
          child: Text(
            'Page-layout demo',
            style: Theme.of(c).textTheme.titleMedium,
          ),
        ),
      ),
    ),
    WidgetbookUseCase(
      name: 'Multiple cards',
      builder: (c) => PageLayout(
        child: Column(
          children: [
            AppCard(
              child: Text(
                'First card',
                style: Theme.of(c).textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 24),
            AppCard(
              child: Text(
                'Second card',
                style: Theme.of(c).textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 24),
            AppCard(
              child: Text(
                'Third card',
                style: Theme.of(c).textTheme.titleMedium,
              ),
            ),
          ],
        ),
      ),
    ),
  ],
);

/// Centers a small story body in a 600px-wide column with padding. Used by
/// primitive stories that don't fill the canvas naturally.
Widget _wrap(Widget child) => Center(
  child: ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 600),
    child: Padding(padding: const EdgeInsets.all(24), child: child),
  ),
);
