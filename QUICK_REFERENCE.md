# Quick Reference: Vercel Deployment

## Local Development

```bash
# Install Vercel CLI (one time)
npm install -g vercel

# Login to Vercel
vercel login

# Start local dev server (with hot reload)
vercel dev

# Visit: http://localhost:3000
# API: http://localhost:3000/api/*
```

## First Deployment

```bash
# 1. Ensure all changes committed
git status
git add .
git commit -m "Ready for Vercel"
git push origin main

# 2. Deploy from CLI (or use Vercel dashboard)
vercel --prod

# 3. Add environment variables in Vercel dashboard
# Dashboard > Settings > Environment Variables
```

## Environment Variables (Required)

```
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Monitoring

```bash
# View live logs
vercel logs --follow

# View specific function logs
vercel logs api/reports/upload.js

# List deployments
vercel list

# Promote previous deployment if needed
vercel promote <deployment-url>
```

## Common Tasks

### Update Frontend Code
```bash
git add public/
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys from main branch
```

### Add New API Endpoint
```
1. Create file: api/newfeature/endpoint.js
2. Export default async function handler(req, res)
3. Push to GitHub
4. Vercel auto-creates route: /api/newfeature/endpoint
```

### Update Environment Variables
```
1. Go to Vercel Dashboard
2. Settings > Environment Variables
3. Add/modify variable
4. Redeploy: git push or manual redeploy button
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Environment variable not found" | Add to Vercel dashboard, wait 30s, redeploy |
| "Firebase auth fails" | Check FIREBASE_PRIVATE_KEY format (preserve \n) |
| "Supabase connection fails" | Verify SUPABASE_URL and SERVICE_ROLE_KEY |
| "API returns 404" | Check function file exists at correct path |
| "Slow on first request" | Normal (cold start). Subsequent requests fast |
| "CORS errors" | Already handled. Verify relative API paths (/api/*) |

## Deployment URLs

| Environment | URL |
|-------------|-----|
| Production | https://your-app.vercel.app |
| Preview (on PR) | Auto-generated |
| Staging | Can set up custom domain |

## API Endpoints

```
GET    /api/health
POST   /api/reports/upload
GET    /api/reports/:reportId/signed-url
POST   /api/reports/:reportId/generate-explanation
```

## File Locations

```
Frontend:  public/
Serverless API: api/
Shared libs: api/lib/
Config: vercel.json
Env template: .env.example
Env (local): .env.local (⚠️ DO NOT COMMIT)
```

## Performance Targets

- ✅ Cold start: 1-2s
- ✅ Warm requests: <500ms
- ✅ File uploads: 2-5s
- ✅ Page load: <2s
- ✅ Uptime: 99.95%

## Security Notes

- ✅ Never commit `.env.local`
- ✅ Use Vercel environment variables (UI)
- ✅ HTTPS automatic
- ✅ Firebase auth tokens required for all API calls
- ✅ Firestore security rules + Supabase RLS active

## Documentation Links

- Vercel: https://vercel.com/docs
- Firebase: https://firebase.google.com/docs
- Supabase: https://supabase.com/docs
- Gemini: https://ai.google.dev/docs

## Rollback

```bash
# View deployments
vercel list

# Promote previous version
vercel promote <deployment-id>

# Or use Vercel dashboard: Deployments tab
```

---

**Status:** ✅ Ready to deploy
**Next:** Follow `DEPLOYMENT_CHECKLIST.md` for full instructions
