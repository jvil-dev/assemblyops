/**
 * Firebase Admin SDK Configuration
 *
 * Initializes Firebase for sending push notifications via FCM.
 * Reads service account credentials from FIREBASE_SERVICE_ACCOUNT env var (JSON string).
 *
 * Guards against missing config so dev environments without Firebase still work.
 *
 * Used by: services/notificationService.ts
 */
import { config as loadEnv } from 'dotenv-flow';
import admin from 'firebase-admin';

loadEnv();

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch {
    console.warn('Failed to initialize Firebase Admin SDK — push notifications disabled');
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
}

export default admin;
