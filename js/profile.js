/*
 * profile.js (compat)
 * Manage user health profile: validation, BMI calculation, save and read from Firestore.
 * Stores profile fields on `users/{uid}` document (merged) so registration and profile share the same doc.
 */

function _getDbAndAuth() {
  if (typeof window !== 'undefined' && window.firebaseDb && window.firebaseAuth) {
    return { db: window.firebaseDb, auth: window.firebaseAuth };
  }
  if (typeof firebase !== 'undefined') {
    window.firebaseAuth = window.firebaseAuth || firebase.auth();
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    return { db: window.firebaseDb, auth: window.firebaseAuth };
  }
  throw new Error('Firebase SDK not found. Include compat CDN scripts before profile.js');
}

function calculateBMI(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  if (!h || !weightKg) return { value: null, status: 'Unknown' };
  const bmiRaw = Number(weightKg) / (h * h);
  const value = parseFloat(bmiRaw.toFixed(2));
  let status = 'Unknown';
  if (value < 18.5) status = 'Underweight';
  else if (value >= 18.5 && value < 25) status = 'Normal';
  else if (value >= 25 && value < 30) status = 'Overweight';
  else status = 'Obese';
  return { value, status };
}

function validateHealthProfile(profile) {
  const errors = [];
  if (!profile) errors.push('Profile data is required');
  else {
    if (!profile.height || profile.height < 50 || profile.height > 250) errors.push('Height must be between 50-250 cm');
    if (!profile.weight || profile.weight < 20 || profile.weight > 300) errors.push('Weight must be between 20-300 kg');
    if (!profile.age || profile.age < 1 || profile.age > 150) errors.push('Age must be between 1-150 years');
    if (!profile.activityLevel) errors.push('Activity level is required');
    if (profile.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(profile.bloodPressure)) errors.push("Blood pressure format: 120/80");
    if (profile.bloodSugar && (profile.bloodSugar < 50 || profile.bloodSugar > 500)) errors.push('Blood sugar must be between 50-500 mg/dL');
  }
  return { valid: errors.length === 0, errors };
}

async function saveHealthProfile(profileData) {
  try {
    const { db, auth } = _getDbAndAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user' };

    const validation = validateHealthProfile(profileData);
    if (!validation.valid) return { success: false, error: 'Validation failed', data: validation };

    const bmi = calculateBMI(profileData.height, profileData.weight);
    const payload = {
      ...profileData,
      bmi: bmi.value,
      bmiStatus: bmi.status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(user.uid).set(payload, { merge: true });

    return { success: true, bmi };
  } catch (err) {
    console.error('saveHealthProfile error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

async function getHealthProfile() {
  try {
    const { db, auth } = _getDbAndAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user' };

    const snap = await db.collection('users').doc(user.uid).get();
    if (!snap.exists) return { success: false, error: 'Profile not found' };
    return { success: true, data: snap.data() };
  } catch (err) {
    console.error('getHealthProfile error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

async function isProfileComplete() {
  try {
    const profileResult = await getHealthProfile();
    if (!profileResult.success) return false;
    const profile = profileResult.data;
    // Check required fields for completion
    return !!(profile.height && profile.weight && profile.age && profile.activityLevel);
  } catch (err) {
    console.error('isProfileComplete error:', err);
    return false;
  }
}

// Expose globally for HTML
window.validateHealthProfile = validateHealthProfile;
window.saveHealthProfile = saveHealthProfile;
window.getHealthProfile = getHealthProfile;
window.calculateBMI = calculateBMI;
window.isProfileComplete = isProfileComplete;
window._getDbAndAuth = _getDbAndAuth;
