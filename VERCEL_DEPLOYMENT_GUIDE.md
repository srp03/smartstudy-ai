# Vercel Deployment Guide for Smart Health Assistant

## Project Structure Overview

Your project combines:
- **Frontend:** Vanilla JavaScript (HTML/CSS/JS) - hosted as static files
- **Backend:** Express.js API server - converted to Vercel serverless functions
- **Storage:** Supabase (remote) + Firebase (auth & Firestore)
- **AI:** Google Gemini API (disabled in hackathon build)

---

## New Vercel-Compatible Structure

```
health-assistant/
├── api/                              # Vercel serverless functions
│   ├── health.js                     # GET /api/health
│   ├── reports/
│   │   ├── upload.js                 # POST /api/reports/upload
│   │   ├── [reportId]/
│   │   │   ├── signed-url.js         # GET /api/reports/:reportId/signed-url
│   │   │   ├── generate-explanation.js
│   │   │   └── analyze.js
│   │   └── test-gemini.js            # GET /api/test-gemini
│   └── index.js                      # POST /api/reports/analyze (legacy)
│
├── public/                           # Static frontend files
│   ├── index.html
│   ├── dashboard.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── reports.html
│   ├── exercise.html
│   ├── doctor-dashboard.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── auth.js
│       ├── auth-guard.js
│       ├── config.js
│       ├── dashboard.js
│       ├── doctor-dashboard.js
│       ├── exercise.js
│       ├── firebase-config.js
│       ├── profile.js
│       ├── reports.js
│       └── secure-config.js
│
├── lib/                              # Shared utilities
│   ├── firebase-admin.js             # Firebase Admin setup
│   ├── supabase.js                   # Supabase client
│   ├── gemini.js                     # Gemini API helpers
│   └── cors-handler.js               # CORS middleware for serverless
│
├── .env.local                        # Local environment (NOT committed)
├── .env.example                      # Example env file
├── vercel.json                       # Vercel configuration
├── package.json                      # Root dependencies
├── README.md                         # Project docs
└── .gitignore

```

---

## Step-by-Step Migration

### 1. Create Directory Structure

```bash
# Move existing files to public/
mkdir -p api/reports/{[reportId]}
mkdir -p lib
mkdir -p public/{js,css}

# Move frontend files
mv *.html public/
mv css/* public/css/
mv js/* public/js/

# Backend utilities go to lib/
```

### 2. Environment Variables

Create `.env.local` (local only, NOT committed):

```
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini API (optional for demo builds)
GEMINI_API_KEY=your-gemini-api-key

# Deployment
VERCEL_URL=https://your-app.vercel.app
NODE_ENV=production
```

In Vercel dashboard, add these same variables under **Settings > Environment Variables**.

### 3. Frontend API Calls

Update all frontend API calls from `http://localhost:3001` to `/api`:

**Before:**
```javascript
fetch('http://localhost:3001/api/reports/upload', ...)
```

**After:**
```javascript
fetch('/api/reports/upload', ...)
```

This works because Vercel automatically routes `/api/*` to serverless functions.

### 4. CORS Configuration

Serverless functions are on the same origin, so CORS is minimal. But add this to each API function:

```javascript
// Minimal CORS for Vercel (same origin)
res.setHeader('Access-Control-Allow-Credentials', 'true')
res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL || '*')
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization')

if (req.method === 'OPTIONS') {
  res.status(200).end()
  return
}
```

### 5. Key Considerations

**File Size Limits:**
- Vercel functions: 250MB (uncompressed)
- Your dependencies are well under this

**Cold Start:**
- First request takes 1-2 seconds (normal)
- Subsequent requests are fast

**Database Connections:**
- Firebase & Supabase handle this, no local DB needed
- Connections are managed by their SDKs

**Upload Limits:**
- Multer file uploads: 10MB limit (already set)
- Supabase Storage: handles large files

**Timeout:**
- Default: 30 seconds
- Max: 900 seconds
- Your endpoints should complete well under 30s

---

## Configuration Files

### vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "public": "public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GEMINI_API_KEY"
  ],
  "functions": {
    "api/reports/upload.js": { "maxDuration": 60 },
    "api/reports/analyze.js": { "maxDuration": 60 },
    "api/reports/[reportId]/analyze.js": { "maxDuration": 60 }
  }
}
```

### package.json (Root)
```json
{
  "name": "smart-health-assistant",
  "version": "2.0.0",
  "description": "Smart Health Assistant - Deployed on Vercel",
  "scripts": {
    "dev": "vercel dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "echo 'Frontend is static, no build needed'",
    "build:backend": "npm install",
    "start": "node api/index.js",
    "test": "echo 'Testing...' && exit 0"
  },
  "engines": {
    "node": "18.x"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^5.2.1",
    "firebase-admin": "^12.0.0",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "tesseract.js": "^5.0.4",
    "@google/generative-ai": "^0.21.0"
  }
}
```

---

## Frontend Integration

### Update API URLs in js/reports.js

All API calls should use **relative paths**:

```javascript
// OLD: http://localhost:3001/api/reports/upload
// NEW: /api/reports/upload

const formData = new FormData()
formData.append('report', file)
formData.append('patientId', user.uid)
formData.append('patientEmail', userEmail)

const response = await fetch('/api/reports/upload', {  // ✅ Relative path
  method: 'POST',
  body: formData,
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Other files to update:
- `js/dashboard.js` - API calls
- `js/exercise.js` - API calls
- `js/profile.js` - API calls

---

## Deployment Checklist

- [ ] Structure project with `api/` and `public/` folders
- [ ] Create `vercel.json` config
- [ ] Update `package.json` with build scripts
- [ ] Convert Express routes to serverless functions
- [ ] Update all frontend API calls to `/api/*` paths
- [ ] Add environment variables to Vercel dashboard
- [ ] Test locally with `vercel dev`
- [ ] Deploy: `vercel --prod`
- [ ] Monitor logs: `vercel logs --follow`

---

## Troubleshooting

**Issue:** "Cannot find module 'express'"
- **Solution:** Ensure `package.json` has all dependencies. Run `npm install`

**Issue:** CORS errors on frontend
- **Solution:** Check that API URLs are relative (`/api/*`) not absolute (`http://localhost:3001`)

**Issue:** Firebase Admin SDK fails
- **Solution:** Verify `FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL` in environment

**Issue:** File uploads fail
- **Solution:** Supabase storage must be configured. Check bucket permissions in Supabase dashboard

**Issue:** Slow cold starts
- **Solution:** Normal for serverless. Use `vercel deploy --skip-build` for faster iterations

---

## Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use environment variables** for all secrets
3. **Enable Vercel's built-in protections**:
   - Data encryption at rest
   - HTTPS enforcement
   - DDoS protection
4. **Firebase Security Rules** - Configure in `firestore.rules`
5. **Supabase Row-Level Security** - Set up for storage access

---

## Performance Optimization

- Static files cached with long TTL
- API responses optimized for fast serialization
- Database queries indexed in Firestore
- Image optimization (if applicable)
- Gzip compression enabled

---

## Next Steps

1. Apply the structure changes (move files, create folders)
2. Create the serverless functions from existing Express routes
3. Configure `vercel.json` and environment variables
4. Test locally with `vercel dev`
5. Deploy with `vercel --prod`

For detailed implementation, see the provided code templates below.
