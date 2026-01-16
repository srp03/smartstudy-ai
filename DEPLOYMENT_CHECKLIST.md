# Vercel Deployment: Step-by-Step Instructions

## Prerequisites

1. **Vercel Account:** https://vercel.com (free tier works great)
2. **GitHub Account:** Repository already connected (https://github.com/srp03/health-2)
3. **Environment Variables Ready:** Firebase credentials and Supabase keys
4. **Node.js 18+:** Verify with `node --version`

---

## Step 1: Prepare Your Local Environment

### Install Vercel CLI
```bash
npm install -g vercel
```

### Login to Vercel
```bash
vercel login
```

### Create `.env.local` (LOCAL ONLY - DO NOT COMMIT)
```bash
# Copy template
cp .env.example .env.local

# Edit with your actual credentials
# Use a text editor to fill in real values
```

### Test Locally with Vercel Dev Server
```bash
# Start local Vercel dev environment
vercel dev

# Your app will run on http://localhost:3000
# API routes automatically available at http://localhost:3000/api/*
```

---

## Step 2: Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment: add serverless functions and config"
git push origin main
```

---

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Fastest)
```bash
vercel --prod
```

### Option B: Deploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Select GitHub repository: `srp03/health-2`
4. Click "Import"
5. Accept defaults
6. Click "Deploy"

---

## Step 4: Configure Environment Variables in Vercel

1. **Go to:** Project Settings > Environment Variables
2. **Add each variable from `.env.example`:**
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY` (preserve newlines as `\n`)
   - `FIREBASE_CLIENT_EMAIL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY` (optional)
   - `NODE_ENV=production`

3. **Important:** Use **Vercel dashboard UI**, not CLI, to avoid escaping issues

### For FIREBASE_PRIVATE_KEY:
- Copy the private key from Firebase service account JSON
- Paste directly into Vercel dashboard text field
- Vercel automatically handles escaping

---

## Step 5: Update Frontend API Calls

All frontend files already use **relative paths** (`/api/*`), but verify these files:

- `js/reports.js` - ✅ Uses `/api/reports/*`
- `js/dashboard.js` - Check for any hardcoded `localhost:3001`
- `js/exercise.js` - Check for any hardcoded URLs
- `js/profile.js` - Check for any hardcoded URLs

Search for `localhost:3001` to find any remaining hardcoded URLs:
```bash
grep -r "localhost:3001" public/
```

If found, update to `/api/*`:
```javascript
// BEFORE
fetch('http://localhost:3001/api/reports/upload', ...)

// AFTER
fetch('/api/reports/upload', ...)
```

---

## Step 6: Verify Deployment

1. **Check Status:** Visit https://vercel.com/dashboard > Your Project
2. **Visit Your App:** Click the URL (usually `smart-health-assistant.vercel.app`)
3. **Test Health Check:** https://your-app.vercel.app/api/health
4. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Backend server is healthy",
     "services": {
       "firebase": "configured",
       "supabase": "configured",
       "node": "v18.x.x"
     }
   }
   ```

---

## Step 7: Monitor and Debug

### View Logs in Real-Time
```bash
vercel logs --follow
```

### Check Specific Function Logs
```bash
vercel logs api/reports/upload.js
```

### View Function Insights
1. Go to Vercel dashboard
2. Click "Functions" tab
3. See real-time metrics, errors, and duration

---

## Step 8: Test Core Flows

### ✅ User Login
1. Visit your app URL
2. Login with test Firebase credentials

### ✅ Report Upload
1. Navigate to Reports page
2. Upload a PDF or image
3. Check function logs for upload status

### ✅ Report Download
1. From Reports page, click download button
2. Should trigger signed URL generation
3. File downloads to your computer

### ✅ AI Diet/Exercise
1. Navigate to relevant pages
2. Generate recommendations
3. Verify API calls complete successfully

---

## Troubleshooting

### Issue: "Environment variables not found"
**Solution:**
1. Verify all variables added in Vercel dashboard
2. Redeploy: `git push` or `vercel --prod`
3. Wait 30 seconds for variables to propagate

### Issue: "Firebase initialization failed"
**Cause:** Invalid or missing credentials
**Solution:**
1. Verify `FIREBASE_PRIVATE_KEY` has escaped newlines
2. Check `FIREBASE_PROJECT_ID` and `FIREBASE_CLIENT_EMAIL` are correct
3. Redeploy after fixing

### Issue: "Cannot upload files"
**Cause:** Supabase credentials missing
**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Check Supabase dashboard: API > Settings for correct keys
3. Redeploy

### Issue: "Slow function initialization"
**Normal:** First request takes 1-2 seconds (cold start)
**Solution:** No action needed. Subsequent requests are fast.

### Issue: "API calls return 404"
**Cause:** Frontend still using old `localhost:3001` URLs
**Solution:**
1. Search codebase: `grep -r "localhost:3001" .`
2. Update to relative paths: `/api/...`
3. Push and redeploy

### Issue: "CORS errors in browser console"
**Solution:**
- CORS should be handled automatically (same origin)
- If persists, check `api/lib/cors-handler.js`
- Verify response headers include `Access-Control-Allow-Origin`

---

## Performance Optimization

### Function Duration
- Most functions: < 2 seconds
- File uploads: < 5 seconds
- Heavy analysis: < 30 seconds

### Bundling
- Vercel automatically bundles dependencies
- Unused code is tree-shaken
- Result: ~500KB total function bundle

### Cold Starts
- First invocation: 1-2 seconds
- After 5 minutes idle: resets
- No action needed (automatic)

---

## Security Best Practices

1. ✅ **Never commit `.env.local`** (already in `.gitignore`)
2. ✅ **Use Vercel environment variables** (not hardcoded)
3. ✅ **Enable HTTPS** (automatic on Vercel)
4. ✅ **Firebase Security Rules** configured for Firestore
5. ✅ **Supabase RLS** configured for storage
6. ✅ **API authentication** via Firebase tokens (already implemented)

---

## Rollback Plan

If deployment has issues:

```bash
# View previous deployments
vercel list

# Promote a previous deployment
vercel promote <deployment-url>

# Or via dashboard: Deployments > Right-click previous > Promote to Production
```

---

## Next Steps

1. ✅ Run `vercel dev` to test locally
2. ✅ Fix any environment variable errors
3. ✅ Deploy with `vercel --prod`
4. ✅ Set environment variables in Vercel dashboard
5. ✅ Test all core features
6. ✅ Monitor logs and performance

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Supabase Docs:** https://supabase.com/docs

Your app is now ready for production! 🚀
