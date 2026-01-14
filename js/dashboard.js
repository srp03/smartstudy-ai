/**
 * Dashboard Module
 * Handles dashboard functionality, AI diet plan generation, and PDF export
 */

// OpenAI API configuration
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with your API key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Make API key available globally for other modules
window.OPENAI_API_KEY = OPENAI_API_KEY;

// Generate diet plan using OpenAI API
async function generateDietPlan(dietType, preferences = {}) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user health profile
    const profileResult = await getHealthProfile();
    if (!profileResult.success) {
      return { success: false, error: 'Health profile not found' };
    }

    const profile = profileResult.data;
    
    // Build prompt based on diet type
    let prompt = '';
    
    switch(dietType) {
      case 'weight-loss-veg':
        prompt = `Generate a 7-day vegetarian weight loss diet plan for a ${profile.age}-year-old ${profile.gender}, BMI ${profile.bmi} (${profile.bmiStatus}), ${profile.activityLevel} activity level. Include daily meals (breakfast, lunch, dinner, snacks) with portion sizes and nutritional information.`;
        break;
      case 'weight-loss-nonveg':
        prompt = `Generate a 7-day non-vegetarian weight loss diet plan for a ${profile.age}-year-old ${profile.gender}, BMI ${profile.bmi} (${profile.bmiStatus}), ${profile.activityLevel} activity level. Include daily meals (breakfast, lunch, dinner, snacks) with portion sizes and nutritional information.`;
        break;
      case 'weight-gain':
        prompt = `Generate a 7-day weight gain diet plan for a ${profile.age}-year-old ${profile.gender}, BMI ${profile.bmi} (${profile.bmiStatus}), ${profile.activityLevel} activity level. Include daily meals (breakfast, lunch, dinner, snacks) with portion sizes and nutritional information.`;
        break;
      case 'bp-patient':
        prompt = `Generate a 7-day low-sodium diet plan for a blood pressure patient. Current BP: ${profile.bloodPressure}. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}. Include daily meals with portion sizes and nutritional information.`;
        break;
      case 'sugar-patient':
        prompt = `Generate a 7-day diabetic-friendly diet plan. Current blood sugar: ${profile.bloodSugar} mg/dL. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}. Include daily meals with portion sizes, glycemic index, and nutritional information.`;
        break;
      case 'custom':
        prompt = `Generate a 7-day personalized diet plan for: ${preferences.disease || 'general health'}. Age: ${profile.age}, Gender: ${profile.gender}, BMI: ${profile.bmi}, Activity level: ${profile.activityLevel}. Include daily meals with portion sizes and nutritional information.`;
        break;
      default:
        prompt = `Generate a 7-day balanced diet plan for a ${profile.age}-year-old ${profile.gender}, BMI ${profile.bmi}, ${profile.activityLevel} activity level.`;
    }

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional nutritionist and dietitian. Provide detailed, practical diet plans.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const dietPlan = data.choices[0].message.content;

    // Save diet plan to Firestore
    await firebaseDb.collection('dietPlans').add({
      userId: user.uid,
      dietType: dietType,
      plan: dietPlan,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, plan: dietPlan };
  } catch (error) {
    console.error('Diet plan generation error:', error);
    
    // Return sample data for demo if API fails
    return {
      success: true,
      plan: getSampleDietPlan(dietType),
      isSample: true
    };
  }
}

// Sample diet plan for demo purposes
function getSampleDietPlan(dietType) {
  const samplePlans = {
    'weight-loss-veg': `7-Day Vegetarian Weight Loss Diet Plan

Day 1:
- Breakfast: Oatmeal with fruits (1 cup) + Green tea
- Lunch: Quinoa salad with vegetables (1.5 cups) + Lentil soup
- Snack: Apple + Handful of almonds
- Dinner: Grilled vegetables with brown rice (1 cup)

Day 2-7: Similar balanced vegetarian meals with calorie control...
[Full 7-day plan with detailed portions and nutritional info]`,

    'weight-loss-nonveg': `7-Day Non-Vegetarian Weight Loss Diet Plan

Day 1:
- Breakfast: Scrambled eggs (2) + Whole grain toast + Green tea
- Lunch: Grilled chicken breast (150g) + Steamed vegetables + Quinoa
- Snack: Greek yogurt with berries
- Dinner: Baked fish (150g) + Salad + Brown rice

[Full 7-day plan with detailed portions and nutritional info]`,

    'weight-gain': `7-Day Weight Gain Diet Plan

Day 1:
- Breakfast: Protein smoothie + Whole grain pancakes + Eggs
- Lunch: Chicken curry with rice + Vegetables + Naan
- Snack: Nuts and dried fruits + Protein shake
- Dinner: Pasta with meat sauce + Garlic bread + Salad

[Full 7-day plan with calorie-dense meals]`,

    'bp-patient': `7-Day Low-Sodium Diet Plan for Blood Pressure

Day 1:
- Breakfast: Oatmeal with fresh fruits (no salt) + Herbal tea
- Lunch: Grilled chicken with steamed vegetables (low sodium)
- Snack: Fresh fruits
- Dinner: Baked fish with quinoa and vegetables

[Full 7-day low-sodium meal plan]`,

    'sugar-patient': `7-Day Diabetic-Friendly Diet Plan

Day 1:
- Breakfast: Whole grain toast + Eggs + Vegetables
- Lunch: Grilled chicken salad with olive oil dressing
- Snack: Greek yogurt with low-GI fruits
- Dinner: Baked fish with sweet potato and vegetables

[Full 7-day low-glycemic index meal plan]`,

    'custom': `7-Day Personalized Diet Plan

Based on your health profile, here's a balanced diet plan:
[Customized meal plan based on user's specific needs]`
  };

  return samplePlans[dietType] || samplePlans['custom'];
}

// Export diet plan as PDF
function exportDietPlanToPDF(planText, filename = 'diet-plan.pdf') {
  // Simple text-based PDF export using browser print functionality
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Diet Plan</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          pre { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>Smart Health Assistant - Diet Plan</h1>
        <pre>${planText}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Export diet plan as text file
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

// Load dashboard data
async function loadDashboard() {
  try {
    const profileResult = await getHealthProfile();
    if (profileResult.success) {
      displayHealthSummary(profileResult.data);
    } else {
      // Redirect to profile if not set up
      window.location.href = 'profile.html';
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
  }
}

// Display health summary on dashboard
function displayHealthSummary(profile) {
  const bmiElement = document.getElementById('bmi-value');
  const bmiStatusElement = document.getElementById('bmi-status');
  const bpElement = document.getElementById('bp-value');
  const sugarElement = document.getElementById('sugar-value');
  const activityElement = document.getElementById('activity-value');

  if (bmiElement) bmiElement.textContent = profile.bmi || 'N/A';
  if (bmiStatusElement) {
    bmiStatusElement.textContent = profile.bmiStatus || 'N/A';
    // Color code BMI status
    const status = profile.bmiStatus?.toLowerCase();
    if (status === 'normal') bmiStatusElement.className = 'text-green-600 font-semibold';
    else if (status === 'overweight' || status === 'obese') bmiStatusElement.className = 'text-red-600 font-semibold';
    else if (status === 'underweight') bmiStatusElement.className = 'text-yellow-600 font-semibold';
  }
  if (bpElement) bpElement.textContent = profile.bloodPressure || 'N/A';
  if (sugarElement) sugarElement.textContent = profile.bloodSugar ? `${profile.bloodSugar} mg/dL` : 'N/A';
  if (activityElement) activityElement.textContent = profile.activityLevel || 'N/A';
}
