import 'package:flutter/material.dart';
import 'package:shared_ui/shared_ui.dart';
import 'package:widgetbook/widgetbook.dart';

/// Widgetbook stories for every shared_ui widget.
///
/// One `WidgetbookComponent` per widget, grouped into `WidgetbookFolder`s.

final storyDirectories = <WidgetbookNode>[
  WidgetbookFolder(
    name: 'Primitives',
    children: [_appCard(), _appButton(), _appBadge(), _statusPill()],
  ),
  WidgetbookFolder(
    name: 'Structural',
    children: [_expandableSection(), _emptyState(), _pageLayout()],
  ),
  WidgetbookFolder(
    name: 'Auth',
    children: [
      _loginScreen(),
      _signUpScreen(),
      _forgotPasswordScreen(),
      _verifyEmailScreen(),
      _authLoadingScreen(),
      _noAccessScreen(),
    ],
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

WidgetbookComponent _loginScreen() => WidgetbookComponent(
  name: 'LoginScreen',
  useCases: [
    WidgetbookUseCase(
      name: 'Default',
      builder: (c) => LoginScreen(
        onGoogle: () async {},
        onEmailPassword: (_, _) async {},
        onForgotPassword: () {},
        onSignUp: () {},
      ),
    ),
    WidgetbookUseCase(
      name: 'Loading',
      builder: (c) => LoginScreen(
        onGoogle: () async {},
        onEmailPassword: (_, _) async {},
        onForgotPassword: () {},
        onSignUp: () {},
        isLoading: true,
      ),
    ),
    WidgetbookUseCase(
      name: 'With error',
      builder: (c) => LoginScreen(
        onGoogle: () async {},
        onEmailPassword: (_, _) async {},
        onForgotPassword: () {},
        onSignUp: () {},
        errorMessage: 'Incorrect email or password.',
      ),
    ),
  ],
);

WidgetbookComponent _signUpScreen() => WidgetbookComponent(
  name: 'SignUpScreen',
  useCases: [
    WidgetbookUseCase(
      name: 'Default',
      builder: (c) => SignUpScreen(
        onGoogle: () async {},
        onEmailPassword: (_, _) async {},
        onSignIn: () {},
      ),
    ),
    WidgetbookUseCase(
      name: 'Loading',
      builder: (c) => SignUpScreen(
        onGoogle: () async {},
        onEmailPassword: (_, _) async {},
        onSignIn: () {},
        isLoading: true,
      ),
    ),
    WidgetbookUseCase(
      name: 'With error',
      builder: (c) => SignUpScreen(
        onGoogle: () async {},
        onEmailPassword: (_, _) async {},
        onSignIn: () {},
        errorMessage: 'An account with that email already exists.',
      ),
    ),
  ],
);

WidgetbookComponent _forgotPasswordScreen() => WidgetbookComponent(
  name: 'ForgotPasswordScreen',
  useCases: [
    WidgetbookUseCase(
      name: 'Initial',
      builder: (c) =>
          ForgotPasswordScreen(onSendReset: (_) async {}, onBack: () {}),
    ),
    WidgetbookUseCase(
      name: 'Sent',
      builder: (c) => ForgotPasswordScreen(
        onSendReset: (_) async {},
        onBack: () {},
        isSent: true,
      ),
    ),
    WidgetbookUseCase(
      name: 'Loading',
      builder: (c) => ForgotPasswordScreen(
        onSendReset: (_) async {},
        onBack: () {},
        isLoading: true,
      ),
    ),
  ],
);

WidgetbookComponent _verifyEmailScreen() => WidgetbookComponent(
  name: 'VerifyEmailScreen',
  useCases: [
    WidgetbookUseCase(
      name: 'Default',
      builder: (c) => VerifyEmailScreen(
        email: 'volunteer@example.com',
        onResend: () async {},
        onCheckVerified: () async {},
        onSignOut: () {},
      ),
    ),
    WidgetbookUseCase(
      name: 'Resending',
      builder: (c) => VerifyEmailScreen(
        email: 'volunteer@example.com',
        onResend: () async {},
        onCheckVerified: () async {},
        onSignOut: () {},
        isResending: true,
      ),
    ),
    WidgetbookUseCase(
      name: 'Checking',
      builder: (c) => VerifyEmailScreen(
        email: 'volunteer@example.com',
        onResend: () async {},
        onCheckVerified: () async {},
        onSignOut: () {},
        isChecking: true,
      ),
    ),
  ],
);

WidgetbookComponent _authLoadingScreen() => WidgetbookComponent(
  name: 'AuthLoadingScreen',
  useCases: [
    WidgetbookUseCase(
      name: 'Default',
      builder: (c) => const AuthLoadingScreen(),
    ),
  ],
);

WidgetbookComponent _noAccessScreen() => WidgetbookComponent(
  name: 'NoAccessScreen',
  useCases: [
    WidgetbookUseCase(
      name: 'Default',
      builder: (c) => NoAccessScreen(onSignOut: () {}),
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
