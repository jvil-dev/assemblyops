import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_ui/shared_ui.dart';

import 'auth_providers.dart';
import 'error_messages.dart';
import 'volunteer_home.dart';

/// Notifies go_router to re-evaluate redirects when auth state changes.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    ref.listen<AsyncValue<User?>>(
      authStateProvider,
      (_, _) => notifyListeners(),
    );
  }
}

final _authRefreshProvider = Provider<_AuthRefreshNotifier>((ref) {
  return _AuthRefreshNotifier(ref);
});

/// Top-level router with redirect guards driven by Firebase Auth state.
///
/// Routes:
///   - `/` AuthLoadingScreen (transient — redirected based on auth state)
///   - `/login`, `/signup`, `/forgot-password` — auth shell
///   - `/verify-email` — gate for unverified Email/Password users
///   - `/volunteer` — Volunteer home
final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(_authRefreshProvider);

  return GoRouter(
    refreshListenable: refresh,
    initialLocation: '/',
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      final loc = state.matchedLocation;

      if (auth.isLoading) {
        return loc == '/' ? null : '/';
      }

      // Read fresh user — catches User.reload() updates that don't always
      // re-emit through authStateChanges.
      final user = ref.read(firebaseAuthProvider).currentUser;
      const authShell = {'/login', '/signup', '/forgot-password'};

      if (user == null) {
        return authShell.contains(loc) ? null : '/login';
      }

      final needsVerify =
          user.providerData.any((p) => p.providerId == 'password') &&
          !user.emailVerified;

      if (needsVerify) {
        return loc == '/verify-email' ? null : '/verify-email';
      }

      if (loc == '/' || loc == '/verify-email' || authShell.contains(loc)) {
        return '/volunteer';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, _) => const AuthLoadingScreen()),
      GoRoute(path: '/login', builder: (_, _) => const _LoginRoute()),
      GoRoute(path: '/signup', builder: (_, _) => const _SignUpRoute()),
      GoRoute(
        path: '/forgot-password',
        builder: (_, _) => const _ForgotPasswordRoute(),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (_, _) => const _VerifyEmailRoute(),
      ),
      GoRoute(path: '/volunteer', builder: (_, _) => const VolunteerHome()),
    ],
  );
});

/// Wraps an async auth action with loading + error state, surfaced through
/// the route's local UI state.
mixin _AuthActionRunner<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  bool loading = false;
  String? error;

  Future<R?> run<R>(Future<R> Function() action) async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      return await action();
    } on FirebaseAuthException catch (e) {
      if (mounted) setState(() => error = authErrorMessage(e));
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
    return null;
  }
}

class _LoginRoute extends ConsumerStatefulWidget {
  const _LoginRoute();
  @override
  ConsumerState<_LoginRoute> createState() => _LoginRouteState();
}

class _LoginRouteState extends ConsumerState<_LoginRoute>
    with _AuthActionRunner<_LoginRoute> {
  @override
  Widget build(BuildContext context) {
    final actions = ref.read(authActionsProvider);
    return LoginScreen(
      onGoogle: () => run(actions.signInWithGoogle),
      onEmailPassword: (email, password) =>
          run(() => actions.signInWithEmailPassword(email, password)),
      onForgotPassword: () => context.push('/forgot-password'),
      onSignUp: () => context.push('/signup'),
      isLoading: loading,
      errorMessage: error,
    );
  }
}

class _SignUpRoute extends ConsumerStatefulWidget {
  const _SignUpRoute();
  @override
  ConsumerState<_SignUpRoute> createState() => _SignUpRouteState();
}

class _SignUpRouteState extends ConsumerState<_SignUpRoute>
    with _AuthActionRunner<_SignUpRoute> {
  @override
  Widget build(BuildContext context) {
    final actions = ref.read(authActionsProvider);
    return SignUpScreen(
      onGoogle: () => run(actions.signInWithGoogle),
      onEmailPassword: (email, password) =>
          run(() => actions.signUpWithEmailPassword(email, password)),
      onSignIn: () => context.go('/login'),
      isLoading: loading,
      errorMessage: error,
    );
  }
}

class _ForgotPasswordRoute extends ConsumerStatefulWidget {
  const _ForgotPasswordRoute();
  @override
  ConsumerState<_ForgotPasswordRoute> createState() =>
      _ForgotPasswordRouteState();
}

class _ForgotPasswordRouteState extends ConsumerState<_ForgotPasswordRoute>
    with _AuthActionRunner<_ForgotPasswordRoute> {
  bool _sent = false;

  @override
  Widget build(BuildContext context) {
    final actions = ref.read(authActionsProvider);
    return ForgotPasswordScreen(
      onSendReset: (email) async {
        await run(() => actions.sendPasswordResetEmail(email));
        if (mounted && error == null) setState(() => _sent = true);
      },
      onBack: () => context.go('/login'),
      isSent: _sent,
      isLoading: loading,
      errorMessage: error,
    );
  }
}

class _VerifyEmailRoute extends ConsumerStatefulWidget {
  const _VerifyEmailRoute();
  @override
  ConsumerState<_VerifyEmailRoute> createState() => _VerifyEmailRouteState();
}

class _VerifyEmailRouteState extends ConsumerState<_VerifyEmailRoute> {
  bool _resending = false;
  bool _checking = false;
  String? _error;

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _error = null;
    });
    try {
      await ref.read(authActionsProvider).sendEmailVerification();
    } on FirebaseAuthException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e));
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  Future<void> _check() async {
    setState(() {
      _checking = true;
      _error = null;
    });
    try {
      final verified = await ref
          .read(authActionsProvider)
          .reloadAndCheckVerified();
      if (verified && mounted) {
        GoRouter.of(context).refresh();
      } else if (mounted) {
        setState(
          () => _error =
              "We don't see your verification yet. Try again in a moment.",
        );
      }
    } on FirebaseAuthException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e));
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = ref.watch(authStateProvider).value?.email ?? '';
    return VerifyEmailScreen(
      email: email,
      onResend: _resend,
      onCheckVerified: _check,
      onSignOut: () => ref.read(authActionsProvider).signOut(),
      isResending: _resending,
      isChecking: _checking,
      errorMessage: _error,
    );
  }
}
