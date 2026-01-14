<<<<<<< HEAD
# Smart Health Assistant - Hackathon MVP

A fully functional health management web application built with modern web technologies, featuring AI-powered diet and exercise recommendations, health profile management, and secure medical report storage.

## 🚀 Features

### 1. User Authentication
- Secure user registration with email/password
- Firebase Authentication integration
- User profile management

### 2. Health Profile
- Comprehensive health information form
- Automatic BMI calculation with status indicators
- Stores: Height, Weight, Age, Blood Group, Blood Pressure, Blood Sugar, Activity Level, Lifestyle

### 3. Dashboard
- Health summary display (BMI, BP, Sugar, Activity Level)
- AI-generated diet plans:
  - Weight Loss (Vegetarian)
  - Weight Loss (Non-Vegetarian)
  - Weight Gain
  - BP Patient Diet
  - Sugar Patient Diet
  - Custom Diet Plan (for specific diseases/conditions)
- Export diet plans as PDF or text files

### 4. Exercise Plans
- Personalized exercise recommendations with YouTube video links
- Filter exercises by health conditions (BP, Sugar) or activity level
- AI-generated custom exercise plans for specific diseases/goals

### 5. Medical Report Storage
- Upload PDF or image medical reports
- Secure storage in Firebase Storage
- View and download reports anytime
- Organized metadata (name, date, type)

### 6. UI/UX
- Modern, responsive design (mobile-first)
- Custom animated cursor
- Tailwind CSS styling
- Smooth animations and transitions

## 🛠️ Tech Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES2026)
- **Backend**: Firebase 2026
  - Authentication
  - Firestore (Database)
  - Storage (File uploads)
- **AI Integration**: OpenAI GPT API
- **Hosting**: Static files (can be hosted on Firebase Hosting, Netlify, Vercel, etc.)

## 📋 Prerequisites

1. **Firebase Account**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com/)
3. **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

## 🔧 Setup Instructions

### Step 1: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication**: 
     - Go to Authentication → Sign-in method
     - Enable "Email/Password"
   - **Firestore Database**:
     - Go to Firestore Database → Create database
     - Start in test mode (for MVP/demo)
     - Choose a location
   - **Storage**:
     - Go to Storage → Get started
     - Start in test mode (for MVP/demo)
     - Use default security rules

4. Get your Firebase configuration:
   - Go to Project Settings → General
   - Scroll down to "Your apps"
   - Click the web icon (`</>`) to add a web app
   - Copy the `firebaseConfig` object

### Step 2: Configure Firebase

1. Open `js/firebase-config.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Configure OpenAI API

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open `js/dashboard.js`
3. Replace `YOUR_OPENAI_API_KEY` with your actual API key:

```javascript
const OPENAI_API_KEY = 'sk-your-actual-api-key-here';
```

**Note**: For hackathon demo, you can use sample data if API limits are exceeded. The app includes fallback sample data.

### Step 4: Firebase Security Rules (Optional for Demo)

For production, update Firestore and Storage rules. For MVP/demo, test mode is acceptable.

**Firestore Rules** (Firestore → Rules):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Rules** (Storage → Rules):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /medical-reports/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 Running the Application

### Option 1: Local Server (Recommended)

1. **Using Python** (if installed):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

2. **Using Node.js** (if installed):
   ```bash
   npx http-server -p 8000
   ```

3. **Using VS Code Live Server**:
   - Install "Live Server" extension
   - Right-click on `index.html` → "Open with Live Server"

4. Open browser: `http://localhost:8000`

### Option 2: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize hosting:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `.` (current directory)
   - Configure as single-page app: `No`
   - Set up automatic builds: `No`

4. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

5. Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

### Option 3: Other Hosting Platforms

- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect GitHub repo or deploy via CLI
- **GitHub Pages**: Push to GitHub and enable Pages

## 📱 Usage Guide

### For Hackathon Demo

1. **Registration**:
   - Go to Register page
   - Fill in username, email, password, age, gender
   - Click "Register"

2. **Health Profile**:
   - After registration, you'll be redirected to profile page
   - Fill in health information
   - BMI will be calculated automatically
   - Click "Save Health Profile"

3. **Dashboard**:
   - View health summary
   - Click any diet plan button to generate AI recommendations
   - Export plans as PDF or text

4. **Exercise Plans**:
   - Browse recommended exercises with YouTube links
   - Filter by condition or activity level
   - Generate custom exercise plans

5. **Medical Reports**:
   - Upload PDF or image reports
   - View and download stored reports

## 🎯 Hackathon Demo Tips

1. **Pre-populate Data**: Create a test account before demo
2. **Sample Reports**: Have sample medical reports ready to upload
3. **API Fallback**: The app includes sample data if OpenAI API fails
4. **Mobile Demo**: Test on mobile device for responsive design showcase
5. **Custom Cursor**: Highlight the custom cursor animation feature

## 📁 Project Structure

```
health/
├── index.html          # Landing page
├── register.html       # User registration
├── login.html          # Login page
├── profile.html        # Health profile form
├── dashboard.html      # Main dashboard
├── exercise.html       # Exercise plans page
├── reports.html        # Medical reports page
├── js/
│   ├── firebase-config.js  # Firebase initialization
│   ├── auth.js             # Authentication functions
│   ├── profile.js          # Health profile & BMI
│   ├── dashboard.js        # Diet plan generation
│   ├── exercise.js         # Exercise recommendations
│   └── reports.js          # Medical report storage
├── css/
│   └── style.css           # Custom styles & cursor
└── README.md               # This file
```

## 🔒 Security Notes

- **Firebase Authentication**: Secure user authentication
- **Firestore Security Rules**: User data is isolated by user ID
- **Storage Security**: Medical reports are user-specific
- **API Keys**: Never commit API keys to public repositories
- **HTTPS**: Use HTTPS in production (Firebase Hosting provides this)

## 🐛 Troubleshooting

### Firebase Not Initialized
- Check `firebase-config.js` has correct configuration
- Ensure Firebase SDK scripts are loaded before config script

### Authentication Errors
- Verify Email/Password is enabled in Firebase Console
- Check browser console for specific error messages

### OpenAI API Errors
- Verify API key is correct
- Check API quota/limits
- App will fall back to sample data if API fails

### File Upload Errors
- Check file size (max 10MB)
- Verify file type (PDF, JPG, PNG only)
- Ensure Storage is enabled in Firebase Console

## 🎨 Customization

### Change Colors
- Modify Tailwind classes in HTML files
- Update gradient backgrounds in `css/style.css`

### Add Features
- Extend Firestore collections in respective JS files
- Add new HTML pages following existing structure
- Update navigation in all pages

## 📝 License

Built for Hackathon MVP - 2026

## 👥 Credits

Built with:
- Firebase 2026
- OpenAI GPT API
- Tailwind CSS
- Modern JavaScript (ES2026)

## 🚀 Future Enhancements

- Real-time health tracking
- Integration with fitness wearables
- Appointment scheduling
- Medication reminders
- Health analytics dashboard
- Multi-language support

---

**Happy Hacking! 🎉**

For questions or issues, check the browser console for error messages and ensure all Firebase services are properly configured.
=======
# smartstudy-ai
AI-powered study planning and productivity platform for engineering students using Google Gemini and Firebase.
>>>>>>> e35e8dbe315c30c5b7aa2d38ccc0b40620f88c66
