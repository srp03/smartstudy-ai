# Environment Variables Configuration for Vercel Deployment

## Complete Environment Variables List

This document contains all environment variables your Smart Health Assistant needs for Vercel deployment. Copy-paste these into your Vercel Dashboard or `.env.local` file.

---

## 🔐 Backend Environment Variables (Server-Side Only)

These variables are **never exposed to the browser** and are only used by backend serverless functions.

### Firebase Admin SDK (Backend Authentication & Database)
```
FIREBASE_PROJECT_ID=[PASTE_FROM_FIREBASE_JSON]
FIREBASE_PRIVATE_KEY=[PASTE_FROM_FIREBASE_JSON_preserve_newlines]
FIREBASE_CLIENT_EMAIL=[PASTE_FROM_FIREBASE_JSON]
```

**Where to get these:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: "health-2edac"
3. Go to Settings (gear icon) > Project Settings
4. Click "Service Accounts" tab
5. Click "Generate New Private Key"
6. JSON file will download (or view in console)
7. Copy these three fields:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Supabase (File Storage - Server-Side)
```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[PASTE_FROM_SUPABASE_DASHBOARD]
```

**Where to get these:**
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings > API Keys
4. Copy:
   - Project URL → `SUPABASE_URL`
   - Service role key (⚠️ NOT the anon key) → `SUPABASE_SERVICE_ROLE_KEY`

### Google Gemini API (Optional - Disabled in Hackathon Build)
```
GEMINI_API_KEY=[PASTE_FROM_GOOGLE_AI_STUDIO]
```

**Where to get this:**
1. Go to Google AI Studio: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key → `GEMINI_API_KEY`

---

## 🌐 Frontend Environment Variables (Browser Accessible)

These variables are prefixed with `NEXT_PUBLIC_` because they need to be accessible in the browser. Vercel automatically exposes them to client-side code.

### Firebase Web Config (Frontend Authentication)
```
NEXT_PUBLIC_FIREBASE_API_KEY=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_APP_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]
```

**Where to get these:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: "health-2edac"
3. Go to Settings (gear icon) > Project Settings
4. Click "General" tab (should be selected)
5. Scroll down to "Your apps" section
6. Click on your web app (or add one if missing)
7. Copy the Firebase Config object fields:
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

### Supabase Web Config (Frontend File Access)
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PASTE_FROM_SUPABASE_DASHBOARD]
```

**Where to get these:**
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings > API Keys
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key (⚠️ NOT the service role key) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🚀 Deployment Settings
```
NODE_ENV=production
```

---

## 📋 Quick Copy-Paste Template

Use this template and fill in your actual values:

```
# ==========================================
# BACKEND - Firebase Admin (Server-Side Only)
# ==========================================
FIREBASE_PROJECT_ID=health-2edac
FIREBASE_PRIVATE_KEY=[PASTE_FROM_FIREBASE_JSON]
FIREBASE_CLIENT_EMAIL=[PASTE_FROM_FIREBASE_JSON]

# ==========================================
# BACKEND - Supabase (Server-Side Only)
# ==========================================
SUPABASE_URL=[PASTE_FROM_SUPABASE]
SUPABASE_SERVICE_ROLE_KEY=[PASTE_FROM_SUPABASE]

# ==========================================
# FRONTEND - Firebase Web Config (Public)
# ==========================================
NEXT_PUBLIC_FIREBASE_API_KEY=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_PROJECT_ID=health-2edac
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]
NEXT_PUBLIC_FIREBASE_APP_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]

# ==========================================
# FRONTEND - Supabase Web Config (Public)
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=[PASTE_FROM_SUPABASE]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PASTE_FROM_SUPABASE]

# ==========================================
# OPTIONAL - Google Gemini (Disabled in Hackathon)
# ==========================================
GEMINI_API_KEY=[PASTE_FROM_GOOGLE_AI_STUDIO]

# ==========================================
# DEPLOYMENT
# ==========================================
NODE_ENV=production
```

---

## ✅ How to Add Variables to Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click on your project: `health-2`
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. For each variable:
   - Paste the KEY in the first field
   - Paste the VALUE in the second field
   - Select "Production" (or specific environments)
   - Click "Save"

### Option 2: Via Vercel CLI

```bash
# Login to Vercel
vercel login

# Set an environment variable
vercel env add FIREBASE_PROJECT_ID
# Then paste: health-2edac

# Repeat for all variables...

# Or edit .env.local locally and run:
vercel deploy --prod
```

### Option 3: Via Git `.env.local` (Local Development Only)

1. Create `.env.local` file in project root:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with real values

3. ⚠️ **NEVER COMMIT THIS FILE** - it's in `.gitignore`

4. Test locally:
```bash
vercel dev
```

---

## 🔍 How to Find Your Firebase Service Account JSON

If you need to regenerate it:

1. Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Save the downloaded JSON file
4. Extract these three fields:

```json
{
  "project_id": "health-2edac",                    ← FIREBASE_PROJECT_ID
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",  ← FIREBASE_PRIVATE_KEY
  "client_email": "firebase-adminsdk-fbsvc@..."    ← FIREBASE_CLIENT_EMAIL
}
```

---

## 🔍 How to Find Your Firebase Web Config

1. Firebase Console > Project Settings > General
2. Scroll to "Your apps"
3. Click your web app
4. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",                    ← NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "health-2edac.firebaseapp.com",  ← NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "health-2edac",               ← NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "health-2edac.appspot.com",   ← NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "1234567890",        ← NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:1234567890:web:abcd1234"      ← NEXT_PUBLIC_FIREBASE_APP_ID
};
```

---

## ⚠️ Important Notes

### Private Key Handling (FIREBASE_PRIVATE_KEY)

The private key contains newlines. When pasting into Vercel:

1. ✅ **Correct way:** Paste the entire key with `\n` markers
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n
   ```

2. Vercel automatically handles the `\n` escaping
3. In code, we use: `.replace(/\\n/g, '\n')` to convert them

### Service Role Key vs Anon Key (Supabase)

- **Service Role Key** (server-side) → `SUPABASE_SERVICE_ROLE_KEY`
  - Has full admin permissions
  - ⚠️ NEVER expose to frontend
  - Used only in backend functions

- **Anon Key** (browser-safe) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Limited public access
  - ✅ Safe to expose to frontend
  - Used for direct client access

### NEXT_PUBLIC_ Prefix

- Variables with `NEXT_PUBLIC_` are injected into browser code
- Variables without prefix are server-only (hidden from browser)
- Never put secrets in `NEXT_PUBLIC_` variables
- Firebase API keys are public (that's why they have the prefix)

---

## 🧪 Verify Your Configuration

After adding all variables to Vercel:

1. **Redeploy:**
   ```bash
   vercel --prod
   ```

2. **Check Health Endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

   Expected response:
   ```json
   {
     "success": true,
     "message": "Backend server is healthy",
     "services": {
       "firebase": "configured",
       "supabase": "configured"
     }
   }
   ```

3. **Check Frontend:**
   - Open browser console (F12)
   - Look for log messages like: `✅ Loaded FIREBASE_CONFIG from environment: NEXT_PUBLIC_FIREBASE_API_KEY`
   - If missing, check Vercel dashboard for the variable

4. **Test Features:**
   - Login with test account
   - Upload a report
   - Download the report
   - Check that AI diet/exercise works

---

## 🆘 Troubleshooting

### "Cannot read property 'project_id'"
- ❌ Missing or wrong `FIREBASE_PROJECT_ID`
- ✅ Check: Firebase Console > Project Settings > Project ID
- ✅ Redeploy after adding

### "Firebase initialization failed"
- ❌ Bad `FIREBASE_PRIVATE_KEY` format
- ✅ Make sure it includes `-----BEGIN PRIVATE KEY-----` and ends with `-----END PRIVATE KEY-----\n`
- ✅ Vercel should handle the `\n` automatically

### "Supabase client initialization failed"
- ❌ Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Check Supabase Dashboard > Settings > API Keys
- ✅ Make sure you're using SERVICE ROLE key, not Anon key

### Frontend shows "Missing required configuration"
- ❌ Missing `NEXT_PUBLIC_*` variables in browser
- ✅ Check Vercel Dashboard > Settings > Environment Variables
- ✅ Make sure variables have `NEXT_PUBLIC_` prefix
- ✅ Wait 30 seconds and redeploy

### "Cannot POST /api/reports/upload"
- ❌ Function not deployed or wrong path
- ✅ Check: `api/reports/upload.js` file exists
- ✅ Check: Vercel logs for deployment errors
- ✅ Redeploy: `vercel --prod`

---

## 📚 Complete Checklist

- [ ] Created `.env.local` for local development (NOT committed)
- [ ] Copied Firebase Project ID
- [ ] Copied Firebase Private Key (with newlines intact)
- [ ] Copied Firebase Client Email
- [ ] Copied Supabase URL
- [ ] Copied Supabase Service Role Key
- [ ] Copied Firebase Web Config (6 values)
- [ ] Copied Supabase Anon Key
- [ ] Added all variables to Vercel Dashboard
- [ ] Waited 30 seconds for variables to propagate
- [ ] Redeployed: `vercel --prod`
- [ ] Tested `/api/health` endpoint
- [ ] Tested login
- [ ] Tested report upload
- [ ] Tested report download
- [ ] Verified browser console (no "missing configuration" errors)
- [ ] Checked Vercel function logs for errors

---

## 🎯 Summary

You now have complete control over your secrets:

- ✅ No hardcoded keys in code
- ✅ All secrets in Vercel environment
- ✅ Different secrets per environment (dev, staging, prod)
- ✅ Easy to rotate keys without code changes
- ✅ Server secrets never exposed to browser
- ✅ Frontend config safely managed

**Your deployment is now secure and production-ready! 🚀**
