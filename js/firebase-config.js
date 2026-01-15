// firebase-config.js (compat build for browser CDN usage)
// This project currently loads the Firebase *compat* CDN in HTML
// (example: https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js).
// Keep this file compat-style (global `firebase`) so pages that include
// the CDN scripts can initialize the app without bundling or ESM imports.

// Load centralized configuration (must be included before this script)
if (typeof window.appConfig === 'undefined') {
  console.error('App config not found. Make sure config.js is loaded before firebase-config.js');
  throw new Error('Application configuration required');
}

// Your Firebase config
const firebaseConfig = window.appConfig.getFirebaseConfig();

// Initialize Firebase using the global `firebase` (compat) object.
// If Firebase CDN scripts are not included on the page, this will throw
// a ReferenceError — keep CDN script tags in HTML (see login.html).
if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not found. Make sure you include the compat CDN scripts in your HTML.');
} else {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Expose commonly used instances on `window` for other non-module scripts
  window.firebaseAuth = firebase.auth();
  window.firebaseDb = firebase.firestore();
  window.firebaseStorage = firebase.storage();
}
