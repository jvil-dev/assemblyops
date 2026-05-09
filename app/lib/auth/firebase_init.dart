import 'package:firebase_core/firebase_core.dart';

import '../firebase_options.dart';

/// Initializes Firebase using the generated platform options.
Future<void> initializeFirebase() async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}
