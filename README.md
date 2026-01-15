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
- **AI Integration**: Google Gemini API (v1.5-flash)
- **Hosting**: Static files (can be hosted on Firebase Hosting, Netlify, Vercel, etc.)

## 📋 Prerequisites

1. **Firebase Account**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Google Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
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

### Step 2: Configure Secure Settings

1. Copy `.env.example` to `js/secure-config.js`:
   ```bash
   cp .env.example js/secure-config.js
   ```

2. Edit `js/secure-config.js` and fill in your actual values:
   - Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Use your Firebase config values from Step 1

```javascript
const secureConfig = {
  GEMINI_API_KEY: "your_actual_gemini_api_key_here",
  FIREBASE_CONFIG: {
    apiKey: "your_firebase_api_key",
    authDomain: "your_project.firebaseapp.com",
    projectId: "your_project_id",
    storageBucket: "your_project.appspot.com",
    messagingSenderId: "your_sender_id",
    appId: "your_app_id"
  }
};
```

**⚠️ Security Note**: Never commit `js/secure-config.js` to version control. It contains sensitive API keys.

### Step 3: Backend Service Account (Optional)

For the Node.js backend server, you'll need a Firebase service account key:

1. Go to Firebase Console → Project Settings → Service accounts
2. Generate a new private key
3. Save the JSON file as `backend/service-account.json`
4. **Never commit this file to version control**

**⚠️ Security Warning**: Service account keys contain sensitive credentials. Keep them secure and never expose them in client-side code.

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

### Development Setup

1. **Install dependencies** (optional, for development tools):
   ```bash
   npm install
   ```

2. **Set up configuration**:
   ```bash
   # Option A: Use the automated setup script
   npm run setup

   # Option B: Manual setup
   # Create .env file with your API keys (see .env.example)
   # Run: npm run setup
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. Open browser: `http://localhost:3000`

### Alternative Local Development

**Using Python** (if installed):
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Using VS Code Live Server**:
- Install "Live Server" extension
- Right-click on `index.html` → "Open with Live Server"

## 🌐 Deployment

### Environment Variables for Production

For production deployment, set these environment variables on your hosting platform:

```bash
GEMINI_API_KEY=your_actual_gemini_api_key
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Firebase Hosting Deployment

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Set environment variables**:
   ```bash
   firebase functions:config:set \
     app.gemini_key="your_gemini_api_key" \
     app.firebase.api_key="your_firebase_api_key" \
     app.firebase.auth_domain="your_project.firebaseapp.com" \
     app.firebase.project_id="your_project_id" \
     app.firebase.storage_bucket="your_project.appspot.com" \
     app.firebase.messaging_sender_id="your_sender_id" \
     app.firebase.app_id="your_app_id"
   ```

4. **Initialize hosting**:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `.` (current directory)
   - Configure as single-page app: `No`
   - Set up automatic builds: `No`

5. **Deploy**:
   ```bash
   firebase deploy --only hosting
   ```

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - Go to your project settings
   - Add the environment variables listed above

### Netlify Deployment

1. **Drag & drop** your project folder to [Netlify](https://app.netlify.com/drop)

2. **Or use Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=.
   ```

3. **Set environment variables** in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add the environment variables listed above

### GitHub Pages (Limited)

⚠️ **Note**: GitHub Pages doesn't support server-side environment variables. For demo purposes only:

1. **Create a public config** (not recommended for production):
   ```javascript
   // Create js/public-config.js (will be committed)
   window.GEMINI_API_KEY = "your_api_key"; // ⚠️ PUBLIC!
   window.FIREBASE_API_KEY = "your_firebase_key"; // ⚠️ PUBLIC!
   // ... etc
   ```

2. **Deploy using GitHub Actions** or manually upload files.

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

### 🔧 Development Setup
- [ ] Run `npm run setup` to generate `js/secure-config.js`
- [ ] Fill in actual API keys in `js/secure-config.js`
- [ ] Test locally with `npm run dev`
- [ ] Verify all features work (login, diet plans, exercise plans, reports)

### 🔒 Security Check
- [ ] `js/secure-config.js` is in `.gitignore`
- [ ] No hardcoded API keys in committed files
- [ ] Firebase service account keys are secure
- [ ] Environment variables are properly configured

### 🌐 Production Deployment
- [ ] Choose hosting platform (Firebase, Vercel, Netlify)
- [ ] Set all required environment variables on hosting platform
- [ ] For static hosts: Run `npm run build` and deploy `./dist`
- [ ] Test deployed application functionality
- [ ] Verify API calls work in production

### 🚀 Go-Live Verification
- [ ] User registration/login works
- [ ] AI diet plan generation functions
- [ ] AI exercise plan generation functions
- [ ] Medical report upload/analysis works
- [ ] All Firebase operations work
- [ ] No console errors in production

## 🔧 Troubleshooting

### Common Issues

**"Configuration validation failed"**
- Ensure all required environment variables are set
- Check that `js/config.js` loads before other scripts

**"Firebase SDK not found"**
- Verify Firebase CDN scripts are included in HTML
- Check script loading order

**API calls failing**
- Verify API keys are correct
- Check browser console for CORS or authentication errors

**Build fails**
- Ensure all environment variables are set before running `npm run build`
- Check that Node.js version is compatible

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
