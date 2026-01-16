/*
 * exercise.js (compat)
 * Exercise recommendations, display helpers and AI-generated plans (compat SDK)
 * Now uses Google Gemini API for enhanced exercise plan generation
 */

// Load centralized configuration
if (typeof window.appConfig === 'undefined') {
  console.error('App config not found. Make sure config.js is loaded before exercise.js');
}

const GEMINI_API_KEY = window.appConfig.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const exerciseDatabase = {
  'bp': [
    { name: 'Walking for Blood Pressure', link: 'https://www.youtube.com/watch?v=1Eo7JdMTPdQ', duration: '30 min' },
    { name: 'Yoga for Hypertension', link: 'https://www.youtube.com/watch?v=4pKly2JojMw', duration: '20 min' },
    { name: 'Low-Impact Cardio', link: 'https://www.youtube.com/watch?v=ml6cT4AZdqI', duration: '25 min' }
  ],
  'sugar': [
    { name: 'Diabetes-Friendly Workout', link: 'https://www.youtube.com/watch?v=0qanF-91aJo', duration: '30 min' },
    { name: 'Resistance Training for Diabetics', link: 'https://www.youtube.com/watch?v=6FoYp4WJ7kE', duration: '20 min' },
    { name: 'Aerobic Exercise for Blood Sugar', link: 'https://www.youtube.com/watch?v=ml6cT4AZdqI', duration: '25 min' }
  ],
  'low-activity': [
    { name: 'Beginner Full Body Workout', link: 'https://www.youtube.com/watch?v=UBMk30rjy0o', duration: '20 min' },
    { name: 'Gentle Stretching Routine', link: 'https://www.youtube.com/watch?v=4pKly2JojMw', duration: '15 min' },
    { name: 'Chair Exercises', link: 'https://www.youtube.com/watch?v=0qanF-91aJo', duration: '15 min' }
  ],
  'moderate-activity': [
    { name: 'Intermediate Cardio Workout', link: 'https://www.youtube.com/watch?v=ml6cT4AZdqI', duration: '30 min' },
    { name: 'Strength Training Basics', link: 'https://www.youtube.com/watch?v=6FoYp4WJ7kE', duration: '25 min' },
    { name: 'HIIT for Beginners', link: 'https://www.youtube.com/watch?v=UBMk30rjy0o', duration: '20 min' }
  ],
  'high-activity': [
    { name: 'Advanced HIIT Workout', link: 'https://www.youtube.com/watch?v=ml6cT4AZdqI', duration: '30 min' },
    { name: 'Full Body Strength Training', link: 'https://www.youtube.com/watch?v=6FoYp4WJ7kE', duration: '40 min' },
    { name: 'Cardio Endurance Training', link: 'https://www.youtube.com/watch?v=UBMk30rjy0o', duration: '45 min' }
  ]
};

function _getDbAuth() {
  if (typeof window !== 'undefined' && window.firebaseDb && window.firebaseAuth) return { db: window.firebaseDb, auth: window.firebaseAuth };
  if (typeof firebase !== 'undefined') {
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    window.firebaseAuth = window.firebaseAuth || firebase.auth();
    return { db: window.firebaseDb, auth: window.firebaseAuth };
  }
  throw new Error('Firebase SDK not found. Include compat CDN scripts and firebase-config.js');
}

function getExercisesByCondition(condition) {
  return exerciseDatabase[condition] || exerciseDatabase['low-activity'];
}

function displayExercises(condition) {
  const exercises = getExercisesByCondition(condition);
  const container = document.getElementById('exercise-list');
  if (!container) return;

  container.innerHTML = exercises.map(exercise => `
    <div class="bg-white rounded-lg shadow-md p-6 mb-4">
      <h3 class="text-xl font-semibold mb-2">${exercise.name}</h3>
      <p class="text-gray-600 mb-4">Duration: ${exercise.duration}</p>
      <a href="${exercise.link}" target="_blank" 
         class="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition">
        Watch on YouTube
      </a>
    </div>
  `).join('');
}

async function generateExercisePlan(condition, customDisease = '') {
  try {
    const { db, auth } = _getDbAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'User not authenticated' };

    const profileResult = (typeof getHealthProfile === 'function') ? await getHealthProfile() : { success: false };
    if (!profileResult.success) return { success: false, error: 'Health profile not found' };
    const profile = profileResult.data;

    let prompt = '';
    let exerciseGoal = '';
    let medicalCondition = customDisease || condition;

    // Determine exercise goal based on condition
    switch (condition) {
      case 'bp':
        exerciseGoal = 'Blood Pressure Management';
        prompt = `Generate a comprehensive 5-day exercise plan for a blood pressure patient. Current BP: ${profile.bloodPressure}. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}.`;
        break;
      case 'sugar':
        exerciseGoal = 'Blood Sugar Regulation';
        prompt = `Generate a comprehensive 5-day exercise plan for a diabetic patient. Current blood sugar: ${profile.bloodSugar} mg/dL. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}.`;
        break;
      case 'low-activity':
        exerciseGoal = 'Beginner Fitness Building';
        prompt = `Generate a comprehensive 5-day exercise plan for a beginner. Age: ${profile.age}, Gender: ${profile.gender}, Current activity level: ${profile.activityLevel}.`;
        break;
      case 'moderate-activity':
        exerciseGoal = 'Intermediate Fitness Maintenance';
        prompt = `Generate a comprehensive 5-day exercise plan for intermediate fitness level. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}.`;
        break;
      case 'high-activity':
        exerciseGoal = 'Advanced Fitness Training';
        prompt = `Generate a comprehensive 5-day exercise plan for advanced fitness level. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}.`;
        break;
      default:
        if (customDisease) {
          exerciseGoal = `Custom: ${customDisease} Management`;
          prompt = `Generate a comprehensive 5-day exercise plan for someone with ${customDisease}. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}.`;
        } else {
          exerciseGoal = 'General Fitness';
          prompt = `Generate a comprehensive 5-day exercise plan for general fitness. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}.`;
        }
    }

    // Enhanced prompt with structured requirements
    prompt += `

Please structure the exercise plan with the following sections:

1. **Warm-up Routine** (5-10 minutes):
   - Light cardio activities
   - Dynamic stretching exercises
   - Joint mobility movements

2. **Main Workout** (20-45 minutes depending on fitness level):
   - Specific exercises with sets/reps or duration
   - Progressive difficulty based on fitness level
   - Include rest periods between sets

3. **Cool-down Routine** (5-10 minutes):
   - Static stretching exercises
   - Deep breathing exercises
   - Light walking or relaxation

4. **Weekly Schedule**:
   - Day 1-5 with specific focuses (e.g., cardio, strength, flexibility)
   - Include rest days or active recovery
   - Frequency: how many days per week

5. **Exercise Guidelines**:
   - Safety precautions
   - When to stop/modify exercises
   - Equipment needed (bodyweight, minimal equipment)
   - Progress tracking tips

6. **Health Considerations**:
   - How exercises support ${exerciseGoal}
   - Modifications for ${profile.bmiStatus} BMI
   - Monitoring heart rate or symptoms
   - When to consult a doctor

7. **YouTube Resources**:
   - Provide 2-3 specific YouTube video links for each major exercise
   - Include search terms for finding additional videos

Make the plan safe, progressive, and appropriate for the individual's age, fitness level, and health condition. Include modifications for beginners and advanced exercisers.`;

    let exercisePlan = null;
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
      exercisePlan = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (!exercisePlan) throw new Error('No content generated by Gemini');

    } catch (err) {
      console.warn('Gemini API call failed for exercise plan, falling back to sample:', err);
      exercisePlan = getSampleExercisePlan(condition, customDisease, profile, exerciseGoal);
    }

    try {
      if (user && db) {
        await db.collection('exercisePlans').add({
          userId: user.uid,
          condition,
          customDisease,
          exerciseGoal,
          plan: exercisePlan,
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
      console.error('Failed to save exercise plan metadata:', err);
    }

    return { success: true, plan: exercisePlan, goal: exerciseGoal };
  } catch (error) {
    console.error('generateExercisePlan error:', error);
    return { success: false, error: (error && error.message) || String(error) };
  }
}

function getSampleExercisePlan(condition, customDisease, profile, exerciseGoal) {
  const targetCondition = customDisease || condition;

  return `# 5-Day ${exerciseGoal} Exercise Plan

## Program Overview
- **Goal**: ${exerciseGoal}
- **Duration**: 5 days/week with 2 rest days
- **Total Weekly Time**: 90-120 minutes
- **Fitness Level**: ${profile.activityLevel}
- **Health Considerations**: ${profile.bmiStatus} BMI, Age ${profile.age}

## Daily Structure

### **Warm-up Routine** (5-10 minutes)
1. March in place - 2 minutes
2. Arm circles (forward and backward) - 1 minute each direction
3. Shoulder rolls - 1 minute
4. Gentle neck stretches - 1 minute
5. Ankle and wrist rotations - 1 minute

### **Main Workout** (20-45 minutes)
**Day 1: Cardio Focus**
- Brisk walking or light jogging - 20-30 minutes
- Bodyweight squats - 3 sets of 10-15 reps
- Wall push-ups - 3 sets of 8-12 reps

**Day 2: Strength Training**
- Marching in place with knee lifts - 5 minutes
- Seated leg lifts - 3 sets of 12 reps each leg
- Arm raises with light weights or water bottles - 3 sets of 10 reps
- Standing calf raises - 3 sets of 15 reps

**Day 3: Flexibility & Balance**
- Standing balance exercises - 5 minutes
- Gentle yoga poses (tree pose, warrior pose) - 10 minutes
- Seated forward bends - 3 sets of 20 seconds hold
- Shoulder and back stretches - 5 minutes

**Day 4: Mixed Cardio-Strength**
- Light cardio intervals - 15 minutes (1 min activity, 30 sec rest)
- Resistance band exercises or bodyweight - 15 minutes
- Core strengthening (seated twists, gentle planks) - 10 minutes

**Day 5: Active Recovery**
- Gentle walking - 20 minutes
- Full body stretching routine - 15 minutes
- Deep breathing exercises - 5 minutes

### **Cool-down Routine** (5-10 minutes)
1. Slow walking to lower heart rate - 2 minutes
2. Static stretches for major muscle groups - 5 minutes
   - Hamstring stretch
   - Quadriceps stretch
   - Shoulder stretch
   - Back stretch
3. Deep breathing and relaxation - 3 minutes

## Weekly Schedule
- **Monday**: Cardio Focus
- **Tuesday**: Strength Training
- **Wednesday**: Rest or light walking
- **Thursday**: Flexibility & Balance
- **Friday**: Mixed Cardio-Strength
- **Saturday**: Active Recovery
- **Sunday**: Complete rest

## Safety Guidelines
- Listen to your body - stop if you feel pain (beyond normal muscle fatigue)
- Stay hydrated throughout the workout
- Breathe normally and don't hold your breath
- Start slow and gradually increase intensity
- Consult your doctor before starting any new exercise program

## Progress Tracking
- Keep a workout journal
- Note how you feel after each session
- Gradually increase duration or intensity as you get stronger
- Aim for consistency over perfection

## YouTube Resources
- "Beginner Home Workout": https://www.youtube.com/watch?v=example1
- "Chair Exercises for Seniors": https://www.youtube.com/watch?v=example2
- "Gentle Yoga for Health": https://www.youtube.com/watch?v=example3

## Health Considerations
This plan is designed to support ${exerciseGoal.toLowerCase()} while being safe for your current health profile. Monitor your ${profile.bloodPressure ? 'blood pressure' : 'energy levels'} and consult healthcare providers as needed.

*Disclaimer: This is a general exercise plan. Consult with a healthcare professional before starting any exercise program, especially if you have medical conditions.*`;
}

async function loadExercisePage() {
  try {
    const profileResult = (typeof getHealthProfile === 'function') ? await getHealthProfile() : { success: false };
    let condition = 'low-activity';
    if (profileResult.success) {
      const profile = profileResult.data;
      if (profile.bloodPressure) condition = 'bp';
      else if (profile.bloodSugar) condition = 'sugar';
      else if (profile.activityLevel === 'high') condition = 'high-activity';
      else if (profile.activityLevel === 'moderate') condition = 'moderate-activity';
    }
    displayExercises(condition);
  } catch (err) {
    console.error('loadExercisePage error:', err);
    displayExercises('low-activity');
  }
}

// Expose globally
window.generateExercisePlan = generateExercisePlan;
window.getExercisesByCondition = getExercisesByCondition;
window.displayExercises = displayExercises;
window.loadExercisePage = loadExercisePage;
