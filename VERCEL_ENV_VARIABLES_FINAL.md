# 🔐 Complete Environment Variables for Vercel Deployment

## Copy-Paste Template (Ready for Vercel Dashboard)

Below is the **complete, clean list** of all environment variables you need to add to Vercel. Copy each line and paste into the Vercel Dashboard > Settings > Environment Variables.

---

## **BACKEND VARIABLES** (Server-Only - NOT Exposed to Browser)

### Firebase Admin SDK
```
FIREBASE_PROJECT_ID=health-2edac
```

```
FIREBASE_PRIVATE_KEY=[PASTE_ENTIRE_PRIVATE_KEY_WITH_-----BEGIN_AND_-----END_]
```

```
FIREBASE_CLIENT_EMAIL=[PASTE_FROM_FIREBASE_SERVICE_ACCOUNT_JSON]
```

### Supabase Storage (Server)
```
SUPABASE_URL=https://[your-project].supabase.co
```

```
SUPABASE_SERVICE_ROLE_KEY=[PASTE_FROM_SUPABASE_API_KEYS]
```

### Gemini API (Optional - Disabled in Hackathon)
```
GEMINI_API_KEY=[PASTE_FROM_GOOGLE_AI_STUDIO]
```

---

## **FRONTEND VARIABLES** (Browser-Accessible - Use `NEXT_PUBLIC_` Prefix)

### Firebase Web Config
```
NEXT_PUBLIC_FIREBASE_API_KEY=[PASTE_FROM_FIREBASE_WEB_CONFIG]
```

```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=health-2edac.firebaseapp.com
```

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=health-2edac
```

```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=health-2edac.appspot.com
```

```
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]
```

```
NEXT_PUBLIC_FIREBASE_APP_ID=[PASTE_FROM_FIREBASE_WEB_CONFIG]
```

### Supabase Web Config
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PASTE_FROM_SUPABASE_API_KEYS]
```

---

## **DEPLOYMENT**

```
NODE_ENV=production
```

---

## 📋 Quick Reference: What Goes Where

| Variable | Type | Where to Paste | From Where |
|----------|------|----------------|-----------|
| `FIREBASE_PROJECT_ID` | Backend | `[PASTE_FROM_FIREBASE_JSON]` | Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | Backend | `-----BEGIN...-----END\n` | Firebase service account JSON |
| `FIREBASE_CLIENT_EMAIL` | Backend | Email string | Firebase service account JSON |
| `SUPABASE_URL` | Backend | `https://xxx.supabase.co` | Supabase Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Long string | Supabase Settings > API |
| `GEMINI_API_KEY` | Backend | API key | Google AI Studio (optional) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Frontend | API key | Firebase Web Config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Frontend | Domain | Firebase Web Config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Frontend | Project ID | Firebase Web Config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Frontend | Bucket | Firebase Web Config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Frontend | ID | Firebase Web Config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Frontend | App ID | Firebase Web Config |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | `https://xxx.supabase.co` | Supabase Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Anon key | Supabase Settings > API |
| `NODE_ENV` | Both | `production` | Constant |

---

## 🎯 Step-by-Step: Get Firebase Service Account JSON

1. Open: https://console.firebase.google.com
2. Select project: `health-2edac`
3. Go to ⚙️ Settings > **Service Accounts**
4. Click **Generate New Private Key**
5. JSON file downloads
6. Open the JSON file and copy:

```json
{
  "type": "service_account",
  "project_id": "health-2edac",               ← FIREBASE_PROJECT_ID
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",  ← FIREBASE_PRIVATE_KEY
  "client_email": "firebase-adminsdk-fbsvc@health-2edac.iam.gserviceaccount.com",  ← FIREBASE_CLIENT_EMAIL
  ...
}
```

---

## 🎯 Step-by-Step: Get Firebase Web Config

1. Open: https://console.firebase.google.com
2. Select project: `health-2edac`
3. Go to ⚙️ Settings > **General**
4. Scroll to "Your apps"
5. Find your web app → Click it
6. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",                      ← NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "health-2edac.firebaseapp.com",  ← NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "health-2edac",                ← NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "health-2edac.appspot.com",   ← NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "1234567890",          ← NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:1234567890:web:abcd1234"        ← NEXT_PUBLIC_FIREBASE_APP_ID
};
```

---

## 🎯 Step-by-Step: Get Supabase Keys

1. Open: https://app.supabase.com
2. Select project
3. Go to ⚙️ Settings > **API Keys**
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL` (and also `SUPABASE_URL`)
   - **Anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🎯 Step-by-Step: Get Gemini API Key (Optional)

1. Open: https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy the key → `GEMINI_API_KEY`

---

## ✅ Vercel Dashboard Setup

1. Go to: https://vercel.com/dashboard
2. Click your project: `health-2`
3. Go to **Settings** tab
4. Click **Environment Variables** (left sidebar)
5. For each variable:
   - **Paste KEY** in first field (e.g., `FIREBASE_PROJECT_ID`)
   - **Paste VALUE** in second field
   - Select **Production** (or specific environments)
   - Click **Save** or **Add**
6. After all variables added:
   - Redeploy: `vercel --prod`
   - Wait 30 seconds for propagation

---

## 🔒 Security Checklist

- ✅ Never commit `.env.local` to Git (it's in `.gitignore`)
- ✅ `FIREBASE_PRIVATE_KEY` includes full `-----BEGIN...-----END` block with `\n`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` is the **service role**, not the anon key
- ✅ `NEXT_PUBLIC_*` variables are safe to expose (they're public keys)
- ✅ Backend variables (without `NEXT_PUBLIC_`) are hidden from browser
- ✅ Vercel handles all secret encryption automatically

---

## 🧪 Verification

After adding all variables:

```bash
# 1. Redeploy
vercel --prod

# 2. Test health check
curl https://your-app.vercel.app/api/health

# 3. Check browser console (F12)
# Should see: ✅ Loaded FIREBASE_CONFIG from environment
```

Expected health check response:
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

---

## 📚 Need More Details?

See complete documentation in:
- **`ENVIRONMENT_VARIABLES_GUIDE.md`** - Full guide with screenshots and troubleshooting
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step deployment instructions
- **`VERCEL_DEPLOYMENT_GUIDE.md`** - Architecture and configuration details

---

## 📝 Notes

- The provided `service-account.json` in the user's attachment appears to be for the `health-2edac` Firebase project
- All frontend variables should include the `NEXT_PUBLIC_` prefix
- Backend variables (without prefix) are server-only and secure
- You can have different environment variables for staging vs. production in Vercel

---

**All set! You're ready to configure Vercel. 🚀**
