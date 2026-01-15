/*
 * dashboard.js (compat)
 * Handles dashboard functionality, AI diet plan generation, and PDF/text export.
 * Uses compat Firestore via window.firebaseDb and auth via checkAuth()/getCurrentUser() from auth.js/profile.js
 * Now uses Google Gemini API for AI diet plan generation
 */

// Load secure configuration
if (typeof window.secureConfig === 'undefined') {
  console.error('Secure config not found. Make sure secure-config.js is loaded before dashboard.js');
}

const GEMINI_API_KEY = window.secureConfig.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function _getDb() {
  if (typeof window !== 'undefined' && window.firebaseDb) return window.firebaseDb;
  if (typeof firebase !== 'undefined') {
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    return window.firebaseDb;
  }
  throw new Error('Firebase DB not found. Include compat CDN scripts and initialize firebase-config.js');
}

// Attach simple handler used by HTML buttons
function handleGenerateDietPlan(dietType) {
  // Delegate to generateDietPlan and update UI (UI logic is in the HTML inline script)
  // Keep this minimal so HTML onclick works.
  // Real work is done by generateDietPlan
  generateDietPlan(dietType).then(result => {
    // no-op here; the page inline handlers will call generateDietPlan directly when needed
    return result;
  });
}

// Make available globally
window.handleGenerateDietPlan = handleGenerateDietPlan;

async function generateDietPlan(dietType, preferences = {}) {
  try {
    const db = _getDb();

    // Use the profile helper to fetch profile
    const profileResult = (typeof getHealthProfile === 'function') ? await getHealthProfile() : { success: false };
    if (!profileResult.success) return { success: false, error: 'Health profile not found' };
    const profile = profileResult.data;

    let prompt = '';
    let dietGoal = '';
    let isVegetarian = false;
    let medicalCondition = '';

    // Parse diet type and set parameters
    switch (dietType) {
      case 'weight-loss-veg':
        dietGoal = 'Weight Loss';
        isVegetarian = true;
        prompt = `Generate a comprehensive 7-day vegetarian weight loss diet plan for a ${profile.age}-year-old ${profile.gender} with BMI ${profile.bmi} (${profile.bmiStatus}) and ${profile.activityLevel} activity level.`;
        break;
      case 'weight-loss-nonveg':
        dietGoal = 'Weight Loss';
        isVegetarian = false;
        prompt = `Generate a comprehensive 7-day non-vegetarian weight loss diet plan for a ${profile.age}-year-old ${profile.gender} with BMI ${profile.bmi} (${profile.bmiStatus}) and ${profile.activityLevel} activity level.`;
        break;
      case 'weight-gain':
        dietGoal = 'Weight Gain';
        prompt = `Generate a comprehensive 7-day weight gain diet plan for a ${profile.age}-year-old ${profile.gender} with BMI ${profile.bmi} (${profile.bmiStatus}) and ${profile.activityLevel} activity level.`;
        break;
      case 'maintain-weight':
        dietGoal = 'Maintain Weight';
        prompt = `Generate a comprehensive 7-day weight maintenance diet plan for a ${profile.age}-year-old ${profile.gender} with BMI ${profile.bmi} (${profile.bmiStatus}) and ${profile.activityLevel} activity level.`;
        break;
      case 'bp-patient':
        dietGoal = 'Blood Pressure Management';
        medicalCondition = 'Blood Pressure';
        prompt = `Generate a comprehensive 7-day low-sodium diet plan for a blood pressure patient. Current BP: ${profile.bloodPressure}. Age: ${profile.age}, Gender: ${profile.gender}, BMI: ${profile.bmi}, Activity level: ${profile.activityLevel}.`;
        break;
      case 'sugar-patient':
        dietGoal = 'Blood Sugar Management';
        medicalCondition = 'Diabetes';
        prompt = `Generate a comprehensive 7-day diabetic-friendly diet plan. Current blood sugar: ${profile.bloodSugar} mg/dL. Age: ${profile.age}, Gender: ${profile.gender}, BMI: ${profile.bmi}, Activity level: ${profile.activityLevel}.`;
        break;
      case 'custom':
        dietGoal = 'Custom Health Condition';
        medicalCondition = preferences.disease || 'general health';
        prompt = `Generate a comprehensive 7-day personalized diet plan for someone with ${medicalCondition}. Age: ${profile.age}, Gender: ${profile.gender}, BMI: ${profile.bmi}, Activity level: ${profile.activityLevel}.`;
        break;
      default:
        dietGoal = 'General Health';
        prompt = `Generate a comprehensive 7-day balanced diet plan for a ${profile.age}-year-old ${profile.gender}, BMI ${profile.bmi}, ${profile.activityLevel} activity level.`;
    }

    // Enhanced prompt with all requirements
    prompt += `

Please structure the diet plan with the following sections:

1. **Daily Meal Structure** (7 days):
   - Breakfast (with timing and portion sizes)
   - Mid-morning Snack
   - Lunch (with timing and portion sizes)
   - Afternoon Snack
   - Dinner (with timing and portion sizes)
   - Evening Drink (optional)

2. **Nutritional Information**:
   - Approximate daily calories
   - Macronutrient breakdown (carbs, proteins, fats)
   - Key nutrients to focus on

3. **Do's and Don'ts**:
   - Foods to include regularly
   - Foods to avoid or limit
   - Eating habits to follow
   - Portion control guidelines

4. **Water Intake Recommendation**:
   - Daily water intake based on age, activity level, and health condition
   - Tips for staying hydrated

5. **Health Considerations**:
   - How this diet supports ${dietGoal}
   ${medicalCondition ? `- Special considerations for ${medicalCondition}` : ''}
   - Adjustments based on BMI status: ${profile.bmiStatus}

${isVegetarian ? 'IMPORTANT: This must be a STRICTLY VEGETARIAN diet plan. No meat, fish, or poultry allowed.' : ''}

Make the plan practical, easy to follow, and nutritionally balanced. Use simple language and include approximate portion sizes.`;

    // Call Gemini API
    let dietPlan = null;
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) throw new Error('Gemini API request failed');

      const data = await response.json();
      dietPlan = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (!dietPlan) throw new Error('No content generated by Gemini');

    } catch (err) {
      console.warn('Gemini API call failed, falling back to sample plan:', err);
      dietPlan = getSampleDietPlan(dietType, profile, dietGoal, medicalCondition, isVegetarian);
    }

    // Save diet plan metadata to Firestore
    try {
      const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : (window.getCurrentUser ? window.getCurrentUser() : null);
      if (user && db) {
        await db.collection('dietPlans').add({
          userId: user.uid,
          dietType,
          dietGoal,
          medicalCondition,
          isVegetarian,
          plan: dietPlan,
          profile: {
            age: profile.age,
            gender: profile.gender,
            bmi: profile.bmi,
            bmiStatus: profile.bmiStatus,
            activityLevel: profile.activityLevel,
            bloodPressure: profile.bloodPressure,
            bloodSugar: profile.bloodSugar
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Failed to save diet plan metadata:', err);
    }

    return { success: true, plan: dietPlan, goal: dietGoal, condition: medicalCondition };
  } catch (error) {
    console.error('generateDietPlan error:', error);
    return { success: false, error: (error && error.message) || String(error) };
  }
}

function getSampleDietPlan(dietType, profile, dietGoal, medicalCondition, isVegetarian) {
  const basePlan = {
    'weight-loss-veg': {
      title: '7-Day Vegetarian Weight Loss Diet Plan',
      calories: '1500-1800 kcal/day',
      structure: `**Breakfast (8:00 AM)**: Oatmeal with berries and nuts (300 kcal)
**Mid-morning Snack (10:30 AM)**: Greek yogurt with apple (150 kcal)
**Lunch (1:00 PM)**: Quinoa salad with mixed vegetables and chickpeas (400 kcal)
**Afternoon Snack (4:00 PM)**: Carrot sticks with hummus (150 kcal)
**Dinner (7:00 PM)**: Grilled tofu with steamed broccoli and brown rice (400 kcal)
**Evening Drink (9:00 PM)**: Herbal tea (0 kcal)`
    },
    'weight-loss-nonveg': {
      title: '7-Day Non-Vegetarian Weight Loss Diet Plan',
      calories: '1600-1900 kcal/day',
      structure: `**Breakfast (8:00 AM)**: Scrambled eggs with spinach and whole grain toast (350 kcal)
**Mid-morning Snack (10:30 AM)**: Cottage cheese with cucumber (150 kcal)
**Lunch (1:00 PM)**: Grilled chicken breast with mixed greens salad (450 kcal)
**Afternoon Snack (4:00 PM)**: Protein shake with banana (200 kcal)
**Dinner (7:00 PM)**: Baked fish with quinoa and steamed vegetables (400 kcal)
**Evening Drink (9:00 PM)**: Green tea (0 kcal)`
    },
    'weight-gain': {
      title: '7-Day Weight Gain Diet Plan',
      calories: '2800-3200 kcal/day',
      structure: `**Breakfast (8:00 AM)**: Protein smoothie with banana, peanut butter, and oats (600 kcal)
**Mid-morning Snack (10:30 AM)**: Whole grain sandwich with cheese and avocado (500 kcal)
**Lunch (1:00 PM)**: Chicken curry with rice and vegetables (700 kcal)
**Afternoon Snack (4:00 PM)**: Nuts, dried fruits, and cheese (400 kcal)
**Dinner (7:00 PM)**: Pasta with meat sauce and garlic bread (600 kcal)
**Evening Drink (9:00 PM)**: Protein shake (200 kcal)`
    },
    'maintain-weight': {
      title: '7-Day Weight Maintenance Diet Plan',
      calories: '2000-2200 kcal/day',
      structure: `**Breakfast (8:00 AM)**: Whole grain cereal with milk and fruits (350 kcal)
**Mid-morning Snack (10:30 AM)**: Yogurt with granola (200 kcal)
**Lunch (1:00 PM)**: Turkey sandwich with salad (450 kcal)
**Afternoon Snack (4:00 PM)**: Apple with almond butter (200 kcal)
**Dinner (7:00 PM)**: Grilled salmon with sweet potato and vegetables (500 kcal)
**Evening Drink (9:00 PM)**: Herbal tea (0 kcal)`
    },
    'bp-patient': {
      title: '7-Day Low-Sodium Blood Pressure Diet Plan',
      calories: '1800-2000 kcal/day',
      structure: `**Breakfast (8:00 AM)**: Oatmeal with fresh berries (no salt) (300 kcal)
**Mid-morning Snack (10:30 AM)**: Fresh fruit salad (150 kcal)
**Lunch (1:00 PM)**: Grilled chicken with unsalted rice and steamed vegetables (450 kcal)
**Afternoon Snack (4:00 PM)**: Carrot sticks with unsalted hummus (150 kcal)
**Dinner (7:00 PM)**: Baked fish with quinoa and low-sodium herbs (400 kcal)
**Evening Drink (9:00 PM)**: Unsweetened herbal tea (0 kcal)`
    },
    'sugar-patient': {
      title: '7-Day Diabetic-Friendly Diet Plan',
      calories: '1600-1800 kcal/day',
      structure: `**Breakfast (8:00 AM)**: Whole grain toast with avocado and eggs (300 kcal)
**Mid-morning Snack (10:30 AM)**: Handful of almonds (150 kcal)
**Lunch (1:00 PM)**: Grilled chicken salad with olive oil dressing (400 kcal)
**Afternoon Snack (4:00 PM)**: Greek yogurt with low-GI berries (150 kcal)
**Dinner (7:00 PM)**: Baked salmon with sweet potato and green vegetables (400 kcal)
**Evening Drink (9:00 PM)**: Water with lemon (0 kcal)`
    }
  };

  const plan = basePlan[dietType] || basePlan['maintain-weight'];

  return `# ${plan.title}

## Nutritional Overview
- **Daily Calories**: ${plan.calories}
- **Macronutrients**: 40% carbs, 30% protein, 30% fats
- **Goal**: ${dietGoal}
${medicalCondition ? `- **Medical Focus**: ${medicalCondition}` : ''}
- **Diet Type**: ${isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}

## Daily Meal Structure
${plan.structure}

## Do's and Don'ts

### Foods to Include:
${isVegetarian ?
  '- Leafy greens, legumes, whole grains\n- Nuts and seeds\n- Fresh fruits and vegetables\n- Dairy products (low-fat)' :
  '- Lean proteins (chicken, fish, eggs)\n- Whole grains and legumes\n- Fresh fruits and vegetables\n- Healthy fats (avocado, nuts)'}

### Foods to Avoid/Limit:
${medicalCondition === 'Blood Pressure' ?
  '- Processed foods high in sodium\n- Canned foods\n- Fast food\n- Excessive salt' :
  medicalCondition === 'Diabetes' ?
  '- Sugary foods and beverages\n- Refined carbohydrates\n- High-GI foods\n- Excessive sweets' :
  '- Processed snacks\n- Sugary drinks\n- Excessive fried foods\n- High-calorie desserts'}

### Eating Habits:
- Eat every 3-4 hours
- Stay hydrated throughout the day
- Practice portion control
- Include protein in every meal

## Water Intake Recommendation
- **Daily Goal**: 8-10 glasses (2.5-3 liters)
- **Activity Adjustment**: Add 1 extra glass for every 30 minutes of exercise
- **Tips**: Drink water before meals, carry a water bottle, set reminders

## Health Considerations
This diet plan is designed to support ${dietGoal.toLowerCase()} while considering your BMI status (${profile.bmiStatus}) and activity level (${profile.activityLevel}). ${medicalCondition ? `Special attention is given to managing ${medicalCondition}.` : ''}

*Note: This is a general plan. Consult with a healthcare professional for personalized advice.*`;
}

function exportDietPlanToPDF(planText, filename = 'diet-plan.pdf') {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`\n    <html>\n      <head>\n        <title>Diet Plan</title>\n        <style>body { font-family: Arial, sans-serif; padding: 20px; } pre { white-space: pre-wrap; }</style>\n      </head>\n      <body>\n        <h1>Smart Health Assistant - Diet Plan</h1>\n        <pre>${planText}</pre>\n      </body>\n    </html>\n  `);
  printWindow.document.close();
  printWindow.print();
}

function exportDietPlanToText(planText, filename = 'diet-plan.txt') {
  const blob = new Blob([planText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadDashboard() {
  try {
    const profileResult = (typeof getHealthProfile === 'function') ? await getHealthProfile() : { success: false };
    if (profileResult.success) {
      displayHealthSummary(profileResult.data);
    } else {
      window.location.href = 'profile.html';
    }
  } catch (err) {
    console.error('loadDashboard error:', err);
  }
}

function displayHealthSummary(profile) {
  const bmiElement = document.getElementById('bmi-value');
  const bmiStatusElement = document.getElementById('bmi-status');
  const bpElement = document.getElementById('bp-value');
  const sugarElement = document.getElementById('sugar-value');
  const activityElement = document.getElementById('activity-value');

  if (bmiElement) bmiElement.textContent = profile.bmi || 'N/A';
  if (bmiStatusElement) {
    bmiStatusElement.textContent = profile.bmiStatus || 'N/A';
    const status = (profile.bmiStatus || '').toLowerCase();
    if (status === 'normal') bmiStatusElement.className = 'text-green-600 font-semibold';
    else if (status === 'overweight' || status === 'obese') bmiStatusElement.className = 'text-red-600 font-semibold';
    else if (status === 'underweight') bmiStatusElement.className = 'text-yellow-600 font-semibold';
  }
  if (bpElement) bpElement.textContent = profile.bloodPressure || 'N/A';
  if (sugarElement) sugarElement.textContent = profile.bloodSugar ? `${profile.bloodSugar} mg/dL` : 'N/A';
  if (activityElement) activityElement.textContent = profile.activityLevel || 'N/A';
}

// Expose functions globally
window.generateDietPlan = generateDietPlan;
window.exportDietPlanToPDF = exportDietPlanToPDF;
window.exportDietPlanToText = exportDietPlanToText;
window.loadDashboard = loadDashboard;
window.displayHealthSummary = displayHealthSummary;
