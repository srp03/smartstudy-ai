/**
 * Authentication Module
 * Handles user registration and login using Firebase Authentication
 */

// Register new user
async function registerUser(email, password, username, age, gender) {
  try {
    // Create user account
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await user.updateProfile({
      displayName: username
    });

    // Store additional user data in Firestore
    await firebaseDb.collection('users').doc(user.uid).set({
      username: username,
      email: email,
      age: age,
      gender: gender,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, user: user };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Logout user
async function logoutUser() {
  try {
    await firebaseAuth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

// Check if user is authenticated
function checkAuth() {
  return new Promise((resolve) => {
    firebaseAuth.onAuthStateChanged((user) => {
      resolve(user);
    });
  });
}

// Get current user
function getCurrentUser() {
  return firebaseAuth.currentUser;
}
