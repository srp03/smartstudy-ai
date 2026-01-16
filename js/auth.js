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
  if (typeof window !== 'undefined' && window.firebaseAuth && window.firebaseDb) {
    return { auth: window.firebaseAuth, db: window.firebaseDb };
  }

  if (typeof firebase !== 'undefined') {
    // Ensure globals are set even if firebase-config.js didn't run
    window.firebaseAuth = window.firebaseAuth || firebase.auth();
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    // Storage removed as per requirements
    // window.firebaseStorage = window.firebaseStorage || firebase.storage();
    return { auth: window.firebaseAuth, db: window.firebaseDb };
  }

  throw new Error('Firebase SDK not found. Include the compat CDN scripts before auth.js.');
}

/**
 * registerUser(email, password, username, age, gender, role)
 * - Creates a new Firebase Auth user, updates their displayName,
 *   and stores a user document in Firestore under `users/{uid}`.
 */
async function registerUser(email, password, username, age, gender, role) {
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
      role: role || 'patient', // Default to patient if not specified
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
 * getUserProfile(uid)
 * - Gets user profile data from Firestore
 */
async function getUserProfile(uid = null) {
  try {
    const { db, auth } = _getFirebaseInstances();
    const userId = uid || auth.currentUser?.uid;

    if (!userId) return { success: false, error: 'No user ID provided' };

    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      return { success: true, data: doc.data() };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (err) {
    console.error('getUserProfile error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

/**
 * getCurrentUser()
 * - Returns the current authenticated user
 */
function getCurrentUser() {
  try {
    const { auth } = _getFirebaseInstances();
    return auth.currentUser;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}
async function getCurrentUserRole() {
  try {
    const profile = await getUserProfile();
    if (profile.success) {
      return profile.data.role || 'patient';
    }
    return 'patient'; // Default role
  } catch (err) {
    console.error('getCurrentUserRole error:', err);
    return 'patient';
  }
}

// Expose globally
window._getFirebaseInstances = _getFirebaseInstances;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.getCurrentUserRole = getCurrentUserRole;
