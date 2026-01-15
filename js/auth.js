/*
 * auth.js (compat)
 * Global functions for authentication using Firebase compat SDK.
 * These functions assume the compat CDN scripts are loaded and
 * `firebase-config.js` has run to initialize `window.firebaseAuth`,
 * `window.firebaseDb`, and `window.firebaseStorage`.
 *
 * All functions return objects of shape: { success: boolean, data?, error? }
 */

function _getFirebaseInstances() {
  if (typeof window !== 'undefined' && window.firebaseAuth && window.firebaseDb && window.firebaseStorage) {
    return { auth: window.firebaseAuth, db: window.firebaseDb, storage: window.firebaseStorage };
  }

  if (typeof firebase !== 'undefined') {
    // Ensure globals are set even if firebase-config.js didn't run
    window.firebaseAuth = window.firebaseAuth || firebase.auth();
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    window.firebaseStorage = window.firebaseStorage || firebase.storage();
    return { auth: window.firebaseAuth, db: window.firebaseDb, storage: window.firebaseStorage };
  }

  throw new Error('Firebase SDK not found. Include the compat CDN scripts before auth.js.');
}

/**
 * registerUser(email, password, username, age, gender)
 * - Creates a new Firebase Auth user, updates their displayName,
 *   and stores a user document in Firestore under `users/{uid}`.
 */
async function registerUser(email, password, username, age, gender) {
  try {
    const { auth, db } = _getFirebaseInstances();

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    if (user && user.updateProfile) {
      await user.updateProfile({ displayName: username });
    }

    await db.collection('users').doc(user.uid).set({
      username: username || null,
      email: email || null,
      age: age || null,
      gender: gender || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, data: { user } };
  } catch (err) {
    console.error('registerUser error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

/**
 * loginUser(email, password)
 * - Signs in a user with email/password and returns the user object on success.
 */
async function loginUser(email, password) {
  try {
    const { auth } = _getFirebaseInstances();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, data: { user: userCredential.user } };
  } catch (err) {
    console.error('loginUser error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

/**
 * logoutUser()
 * - Signs out the current user.
 */
async function logoutUser() {
  try {
    const { auth } = _getFirebaseInstances();
    await auth.signOut();
    return { success: true };
  } catch (err) {
    console.error('logoutUser error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

/**
 * checkAuth()
 * - Returns a promise that resolves with the current user (or null) when auth state is known.
 */
function checkAuth() {
  try {
    const { auth } = _getFirebaseInstances();
    return new Promise((resolve) => {
      auth.onAuthStateChanged((user) => resolve(user));
    });
  } catch (err) {
    console.error('checkAuth error:', err);
    return Promise.resolve(null);
  }
}

/**
 * getCurrentUser()
 * - Synchronously returns the currently signed-in user or null.
 */
function getCurrentUser() {
  try {
    const { auth } = _getFirebaseInstances();
    return auth.currentUser || null;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}
