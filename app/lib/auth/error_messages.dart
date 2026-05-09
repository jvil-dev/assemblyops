import 'package:firebase_auth/firebase_auth.dart';

/// Maps a [FirebaseAuthException] code to a human-readable message.
String authErrorMessage(FirebaseAuthException error) {
  return switch (error.code) {
    'invalid-email' => 'That email address looks invalid.',
    'user-disabled' => 'This account has been disabled.',
    'user-not-found' => 'No account found with that email.',
    'wrong-password' => 'Incorrect password.',
    'invalid-credential' => 'Incorrect email or password.',
    'email-already-in-use' => 'An account already exists for that email.',
    'operation-not-allowed' => 'Email/password sign-in is currently disabled.',
    'weak-password' => 'Password is too weak. Use at least 8 characters.',
    'too-many-requests' => 'Too many attempts. Try again in a few minutes.',
    'network-request-failed' =>
      'Network error. Check your connection and try again.',
    'requires-recent-login' => 'Please sign in again to continue.',
    'account-exists-with-different-credential' =>
      'An account with this email already exists with a different sign-in method.',
    _ => error.message ?? 'Something went wrong. Please try again.',
  };
}
