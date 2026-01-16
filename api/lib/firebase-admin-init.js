/**
 * Firebase Admin SDK initialization for Vercel serverless functions
 * 
 * Environment variables required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY (with \\n for newlines)
 * - FIREBASE_CLIENT_EMAIL
 */

import admin from 'firebase-admin';

let db = null;
let auth = null;

export function getFirebaseDb() {
  if (db) return db;

  try {
    // Initialize Firebase Admin only once (prevents redeploy crashes)
    if (!admin.apps || admin.apps.length === 0) {
      // Verify all required env vars are present
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (!projectId || !privateKey || !clientEmail) {
        throw new Error(
          'Missing Firebase credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set.'
        );
      }

      // Handle newline escaping: convert \\n to actual newlines
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      const serviceAccount = {
        projectId: projectId,
        privateKey: formattedPrivateKey,
        clientEmail: clientEmail
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('✅ Firebase Admin SDK initialized with environment variables');
    }

    db = admin.firestore();
    return db;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error && error.message ? error.message : String(error));
    throw new Error('Firebase Admin SDK initialization failed: ' + (error && error.message || 'Unknown error'));
  }
}


export function getFirebaseAuth() {
  if (auth) return auth;

  if (!admin.apps || admin.apps.length === 0) {
    getFirebaseDb(); // Initialize if not already done
  }

  auth = admin.auth();
  return auth;
}

export function getFieldValue() {
  return admin.firestore.FieldValue;
}
