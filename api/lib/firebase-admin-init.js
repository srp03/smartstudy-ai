/**
 * Firebase Admin SDK initialization for Vercel serverless functions
 * 
 * Environment variables required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY (base64 encoded or raw)
 * - FIREBASE_CLIENT_EMAIL
 */

import admin from 'firebase-admin';

let db = null;

export function getFirebaseDb() {
  if (db) return db;

  try {
    // Initialize Firebase Admin only once
    if (!admin.apps || admin.apps.length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : null;

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    db = admin.firestore();
    return db;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    throw new Error('Firebase Admin SDK initialization failed');
  }
}

export function getFirebaseAuth() {
  if (!admin.apps || admin.apps.length === 0) {
    getFirebaseDb(); // Initialize if not already done
  }
  return admin.auth();
}

export function getFieldValue() {
  return admin.firestore.FieldValue;
}
