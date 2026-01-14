/**
 * Exercise Module
 * Handles exercise recommendations, YouTube links, and AI-generated exercise plans
 */

// Exercise database with YouTube links
const exerciseDatabase = {
  'bp': [
    { name: 'Walking for Blood Pressure', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '30 min' },
    { name: 'Yoga for Hypertension', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '20 min' },
    { name: 'Low-Impact Cardio', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '25 min' }
  ],
  'sugar': [
    { name: 'Diabetes-Friendly Workout', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '30 min' },
    { name: 'Resistance Training for Diabetics', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '20 min' },
    { name: 'Aerobic Exercise for Blood Sugar', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '25 min' }
  ],
  'low-activity': [
    { name: 'Beginner Full Body Workout', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '20 min' },
    { name: 'Gentle Stretching Routine', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '15 min' },
    { name: 'Chair Exercises', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '15 min' }
  ],
  'moderate-activity': [
    { name: 'Intermediate Cardio Workout', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '30 min' },
    { name: 'Strength Training Basics', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '25 min' },
    { name: 'HIIT for Beginners', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '20 min' }
  ],
  'high-activity': [
    { name: 'Advanced HIIT Workout', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '30 min' },
    { name: 'Full Body Strength Training', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '40 min' },
    { name: 'Cardio Endurance Training', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '45 min' }
  ]
};

// Generate exercise plan using OpenAI API
async function generateExercisePlan(condition, customDisease = '') {
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
    
    // Build prompt
    let prompt = '';
    if (customDisease) {
      prompt = `Generate a 5-day exercise plan for someone with ${customDisease}. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}. Include specific exercises, duration, sets/reps, and provide YouTube video links for each exercise. Make it safe and appropriate for the condition.`;
    } else {
      prompt = `Generate a 5-day exercise plan for a ${condition} patient. Age: ${profile.age}, Gender: ${profile.gender}, Activity level: ${profile.activityLevel}. Include specific exercises, duration, sets/reps, and provide YouTube video links for each exercise.`;
    }

    // Get API key from window or use placeholder
    const apiKey = window.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY';
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fitness trainer. Provide safe, effective exercise plans with YouTube video recommendations.'
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
    const exercisePlan = data.choices[0].message.content;

    // Save exercise plan to Firestore
    await firebaseDb.collection('exercisePlans').add({
      userId: user.uid,
      condition: condition,
      customDisease: customDisease,
      plan: exercisePlan,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, plan: exercisePlan };
  } catch (error) {
    console.error('Exercise plan generation error:', error);
    
    // Return sample data for demo
    return {
      success: true,
      plan: getSampleExercisePlan(condition, customDisease),
      isSample: true
    };
  }
}

// Sample exercise plan for demo
function getSampleExercisePlan(condition, customDisease = '') {
  const targetCondition = customDisease || condition;
  
  return `5-Day Exercise Plan for ${targetCondition}

Day 1 - Cardio Focus:
- Warm-up: 5 min light stretching
- Main: 20 min low-impact cardio (walking/jogging)
- YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
- Cool-down: 5 min stretching

Day 2 - Strength Training:
- Warm-up: 5 min
- Main: 3 sets x 10 reps of bodyweight exercises
- YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
- Cool-down: 5 min

Day 3-5: Progressive exercise routine...
[Full 5-day plan with specific exercises and YouTube links]`;
}

// Get exercises based on condition
function getExercisesByCondition(condition) {
  return exerciseDatabase[condition] || exerciseDatabase['low-activity'];
}

// Display exercises on page
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

// Load exercise page
async function loadExercisePage() {
  try {
    const profileResult = await getHealthProfile();
    if (profileResult.success) {
      const profile = profileResult.data;
      
      // Determine condition
      let condition = 'low-activity';
      if (profile.bloodPressure) condition = 'bp';
      else if (profile.bloodSugar) condition = 'sugar';
      else if (profile.activityLevel === 'high') condition = 'high-activity';
      else if (profile.activityLevel === 'moderate') condition = 'moderate-activity';
      
      displayExercises(condition);
    } else {
      displayExercises('low-activity');
    }
  } catch (error) {
    console.error('Load exercise page error:', error);
    displayExercises('low-activity');
  }
}
