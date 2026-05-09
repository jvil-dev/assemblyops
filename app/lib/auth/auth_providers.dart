import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_role.dart';

/// Singleton FirebaseAuth instance.
final firebaseAuthProvider = Provider<FirebaseAuth>((ref) {
  return FirebaseAuth.instance;
});

/// Streams the current authenticated user (or null when signed out).
final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider).authStateChanges();
});

/// Admin allowlist (client-side stub until backend role detection lands).
const _kAdminAllowlist = ['jvilleda723555@gmail.com'];

/// Current user's role, derived from the auth stream.
final currentRoleProvider = Provider<AsyncValue<AppRole>>((ref) {
  final auth = ref.watch(authStateProvider);
  return auth.whenData((user) {
    if (user == null) return AppRole.volunteer;
    if (_kAdminAllowlist.contains(user.email)) return AppRole.admin;
    return AppRole.volunteer;
  });
});

/// Auth side-effects: sign-in, sign-up, password reset, sign-out.
class AuthActions {
  AuthActions(this._auth);

  final FirebaseAuth _auth;

  Future<void> signInWithGoogle() async {
    final provider = GoogleAuthProvider();
    if (kIsWeb) {
      await _auth.signInWithPopup(provider);
    } else {
      await _auth.signInWithProvider(provider);
    }
  }

  Future<UserCredential> signInWithEmailPassword(
    String email,
    String password,
  ) {
    return _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<UserCredential> signUpWithEmailPassword(
    String email,
    String password,
  ) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    await cred.user?.sendEmailVerification();
    return cred;
  }

  Future<void> sendPasswordResetEmail(String email) {
    return _auth.sendPasswordResetEmail(email: email);
  }

  Future<void> sendEmailVerification() async {
    await _auth.currentUser?.sendEmailVerification();
  }

  Future<bool> reloadAndCheckVerified() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    await user.reload();
    return _auth.currentUser?.emailVerified ?? false;
  }

  Future<void> signOut() => _auth.signOut();
}

/// Side-effect actions for auth flows.
final authActionsProvider = Provider<AuthActions>((ref) {
  return AuthActions(ref.watch(firebaseAuthProvider));
});
