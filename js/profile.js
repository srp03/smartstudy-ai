/**
 * Health Profile Module
 * Handles health profile form submission, BMI calculation, and Firestore storage
 */

// Calculate BMI and return status
function calculateBMI(height, weight) {
  // Height in meters, weight in kg
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  let status = '';
  if (bmi < 18.5) {
    status = 'Underweight';
  } else if (bmi >= 18.5 && bmi < 25) {
    status = 'Normal';
  } else if (bmi >= 25 && bmi < 30) {
    status = 'Overweight';
  } else {
    status = 'Obese';
  }
  
  return {
    value: bmi.toFixed(2),
    status: status
  };
}

// Save health profile to Firestore
async function saveHealthProfile(profileData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Calculate BMI
    const bmi = calculateBMI(profileData.height, profileData.weight);
    profileData.bmi = parseFloat(bmi.value);
    profileData.bmiStatus = bmi.status;

    // Save to Firestore
    await firebaseDb.collection('healthProfiles').doc(user.uid).set({
      ...profileData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, bmi: bmi };
  } catch (error) {
    console.error('Save profile error:', error);
    return { success: false, error: error.message };
  }
}

// Get health profile from Firestore
async function getHealthProfile() {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const doc = await firebaseDb.collection('healthProfiles').doc(user.uid).get();
    if (doc.exists) {
      return { success: true, data: doc.data() };
    } else {
      return { success: false, error: 'Profile not found' };
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: error.message };
  }
}

// Validate health profile input
function validateHealthProfile(data) {
  const errors = [];

  if (!data.height || data.height < 50 || data.height > 250) {
    errors.push('Height must be between 50-250 cm');
  }
  if (!data.weight || data.weight < 20 || data.weight > 300) {
    errors.push('Weight must be between 20-300 kg');
  }
  if (!data.age || data.age < 1 || data.age > 150) {
    errors.push('Age must be between 1-150 years');
  }
  if (data.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(data.bloodPressure)) {
    errors.push('Blood pressure format: XXX/XX (e.g., 120/80)');
  }
  if (data.bloodSugar && (data.bloodSugar < 50 || data.bloodSugar > 500)) {
    errors.push('Blood sugar must be between 50-500 mg/dL');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}
