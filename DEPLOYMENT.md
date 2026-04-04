# 🚀 QNow – Complete Deployment Guide
### From zero to live in ~2 hours, 100% free

---

## 📋 What You Need (All Free)
| Tool | Purpose | Cost |
|------|---------|------|
| [GitHub](https://github.com) | Host code | Free |
| [Firebase](https://firebase.google.com) | Firestore DB + FCM notifications | Free (Spark plan) |
| [Vercel](https://vercel.com) | Host React app | Free |
| [Meta Developers](https://developers.facebook.com) | WhatsApp Cloud API | Free (1000 msgs/month) |
| Node.js 18+ | Local development | Free |

---

## PHASE 1 — Firebase Setup

### Step 1.1 — Create Firebase project
1. Go to https://console.firebase.google.com
2. Click **Add project** → Name it `qnow` → Disable Google Analytics (not needed) → **Create project**
3. Wait for it to provision (~30 seconds)

### Step 1.2 — Create Firestore database
> You said you already did this — just verify the settings below.

1. Left sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** → select region `asia-south1` (Mumbai — closest to India)
4. Click **Enable**

**Verify your collections match this schema:**

```
vendors/
  {vendorId}: {
    name, category, description,
    city, location, lat, lng,
    openTime, closeTime, avgSlotMinutes,
    icon, password, status,          ← "pending" | "approved" | "suspended"
    plan, freeTokensUsed, planStart,
    isOpen, served, walkins, lastToken,
    createdAt
  }

tokens/
  {tokenId}: {
    vendorId, name, mobile, pin,
    tokenNumber, status,             ← "waiting" | "serving" | "done"
    isWalkIn, notified3, notified15,
    fcmToken, createdAt, calledAt, completedAt
  }

users/
  {mobile}: { name, mobile, pin, updatedAt }

activityLog/
  {logId}: { msg, adminAction, time }
```

### Step 1.3 — Deploy Firestore security rules and indexes
1. In your terminal, inside the `qnow` folder:
```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

> ⚠ **This step is critical.** Without the indexes deployed, the live queue subscription
> will fail silently and the vendor dashboard will show a blank queue. The `firestore.indexes.json`
> file in the project sets up the required compound index for `tokens` (vendorId + createdAt).

### Step 1.4 — Get your Firebase config keys
1. Firebase Console → Project Settings (⚙ gear icon) → **General tab**
2. Scroll to **Your apps** → Click **</>** (Web app)
3. Register app as `qnow-web`
4. Copy the `firebaseConfig` object — you'll need all 6 values for `.env`

### Step 1.5 — Get your VAPID key (for FCM push)
1. Firebase Console → Project Settings → **Cloud Messaging tab**
2. Scroll to **Web configuration**
3. Click **Generate key pair** under Web Push certificates
4. Copy the key — this is your `VITE_FIREBASE_VAPID_KEY`

### Step 1.6 — Enable FCM (Cloud Messaging)
1. Firebase Console → Build → **Cloud Messaging**
2. It should already be enabled. If not, click Enable.

### Step 1.7 — Set up Cloud Functions (for server-side push)
```bash
cd qnow/functions
npm install
cd ..
firebase deploy --only functions
```
> ⚠ Cloud Functions require the **Blaze (pay-as-you-go) plan**
> but has a **free tier of 2 million calls/month** — you won't pay anything at MVP scale.
> Upgrade only when prompted: Firebase Console → Spark → Upgrade to Blaze.

---

## PHASE 2 — WhatsApp Cloud API Setup (Free)

### Step 2.1 — Create Meta Developer account
1. Go to https://developers.facebook.com
2. Sign in with your Facebook account → **Get Started**
3. Click **Create App** → **Business** type → fill in app name `QNow`

### Step 2.2 — Add WhatsApp product
1. On your app dashboard → **Add a Product** → find **WhatsApp** → **Set Up**
2. You'll be on the **API Setup** page

### Step 2.3 — Get your credentials
From the **API Setup** page, copy:
- **Temporary access token** → `VITE_WHATSAPP_TOKEN`
- **Phone number ID** → `VITE_WHATSAPP_PHONE_ID`

> The temporary token expires in 24 hours. For production, generate a **Permanent Token**:
> Meta Business Suite → Settings → System Users → Create system user → Generate token.

### Step 2.4 — Add test recipients
1. On the API Setup page → **To** field → click **Manage phone number list**
2. Add the mobile numbers you want to test with (enter them and verify via OTP)
3. You can message up to 5 test numbers for free without business verification

### Step 2.5 — Go live (when ready)
1. Meta Business Suite → Verify your business
2. Submit a WhatsApp Business Account
3. After approval: unlimited messaging, 1000 free conversations/month, then ~₹0.60/conversation

---

## PHASE 3 — Firebase Service Worker

**Edit `public/firebase-messaging-sw.js`** — replace the 6 `REPLACE_WITH_...` placeholders with your actual Firebase config values:

```js
firebase.initializeApp({
  apiKey:            'AIzaSy...',       // your actual value
  authDomain:        'qnow.firebaseapp.com',
  projectId:         'qnow',
  storageBucket:     'qnow.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abc123',
})
```

> ⚠ This file is public but only contains read-only config — this is safe and standard practice.

---

## PHASE 4 — Local Development

### Step 4.1 — Install dependencies
```bash
cd qnow
npm install
```

### Step 4.2 — Create your .env file
```bash
cp .env.example .env
```
Now edit `.env` and fill in **all** values from Steps 1.4, 1.5, and 2.3:
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=qnow.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qnow
VITE_FIREBASE_STORAGE_BUCKET=qnow.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456...
VITE_FIREBASE_APP_ID=1:123456:web:abc...
VITE_FIREBASE_VAPID_KEY=BFdX...

VITE_WHATSAPP_TOKEN=EAABwz...
VITE_WHATSAPP_PHONE_ID=12345678...

VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=ChangeThis!2024

VITE_APP_URL=http://localhost:5173
```

### Step 4.3 — Run locally
```bash
npm run dev
```
Open http://localhost:5173 — the full app should be running!

### Step 4.4 — Test the flow
1. Go to **/vendor** → Register a test service → check Firestore for the new doc
2. Go to **/admin** → Login → Approve the vendor
3. Go to **/browse** → Find and join the queue → check WhatsApp on your test number
4. Go back to **/vendor/dashboard** → Call Next → verify notification fires

---

## PHASE 5 — Deploy to GitHub

### Step 5.1 — Create GitHub repo
1. Go to https://github.com/new
2. Name: `qnow` · Private · No README
3. Click **Create repository**

### Step 5.2 — Push your code
```bash
cd qnow
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/qnow.git
git push -u origin main
```

---

## PHASE 6 — Deploy to Vercel (Free Hosting)

### Step 6.1 — Create Vercel account
1. Go to https://vercel.com → Sign up with GitHub

### Step 6.2 — Import project
1. Vercel dashboard → **Add New → Project**
2. Click **Import** next to your `qnow` GitHub repo
3. Framework preset: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. **DO NOT click Deploy yet** — add env vars first!

### Step 6.3 — Add environment variables in Vercel
1. Expand **Environment Variables** section
2. Add **every variable** from your `.env` file one by one
3. Change `VITE_APP_URL` to your Vercel URL (you'll see it on the next page) — e.g. `https://qnow.vercel.app`
4. Click **Deploy**

### Step 6.4 — Wait for build (~2 minutes)
Vercel will build and deploy. You'll get a URL like `https://qnow.vercel.app`.

### Step 6.5 — Add custom domain (optional, free)
1. Vercel → your project → **Settings → Domains**
2. Add `qnow.in` or any domain you own
3. Update your domain's DNS as instructed
> Free `.in` domains cost ~₹500/year from GoDaddy or Namecheap

---

## PHASE 7 — Final Checks

### Checklist before going live:
- [ ] Firestore rules deployed
- [ ] `.env` values set correctly in Vercel (not just locally)
- [ ] `firebase-messaging-sw.js` has your real Firebase config (not placeholders)
- [ ] WhatsApp test numbers added and verified
- [ ] Admin credentials changed from default (`QNow@2024!`)
- [ ] Test full flow: Register vendor → Admin approve → Customer join → Notifications fire
- [ ] Test on mobile browser (Android Chrome recommended for FCM)

---

## 💰 Cost Summary at Launch

| Service | Free Tier | When You'd Pay |
|---------|-----------|----------------|
| Vercel Hosting | Unlimited deploys, 100GB bandwidth | Never (at MVP scale) |
| Firestore | 50K reads + 20K writes/day | After ~1000 active tokens/day |
| FCM (Push) | Unlimited | Never (completely free) |
| Cloud Functions | 2M calls/month | After ~2M API calls/month |
| WhatsApp API | 1000 conversations/month | After 1000 conversations |
| GitHub | Unlimited private repos | Never |
| **TOTAL** | **₹0/month** | **Only after real scale** |

---

## 📈 Monetisation Roadmap

### Month 1–3 (Free tier, build users)
- First 50 tokens OR 30 days free per vendor
- Focus on onboarding vendors in 2–3 cities
- Collect feedback, fix bugs

### Month 3+ (Launch ₹500/month plan)
1. Firestore: Add a `planExpiry` field — set it when vendor upgrades
2. In `VendorDashboard.jsx`: block new tokens when `freeTokensUsed >= 50` AND `planExpiry` is past
3. Payment: **Razorpay Free** (no monthly fee, 2% per transaction) or **UPI direct** (zero cost)
4. After payment, admin manually sets `plan: 'paid'` and extends `planExpiry` + 30 days

### Revenue targets:
| Vendors | Monthly Revenue |
|---------|----------------|
| 10 paying | ₹5,000 |
| 50 paying | ₹25,000 |
| 100 paying | ₹50,000 |
| 500 paying | ₹2,50,000 |

---

## 🆘 Common Issues & Fixes

**"Firebase: Error (auth/...)"**
→ Check all 6 Firebase config values in Vercel env vars. Redeploy after changes.

**WhatsApp messages not sending**
→ Temporary token expired (24hr limit). Generate a permanent system user token.
→ Recipient not in test whitelist. Add their number in Meta Developer Console.

**Push notifications not working**
→ Chrome only (no iOS Safari support yet).
→ Check `VITE_FIREBASE_VAPID_KEY` is correct.
→ Make sure `firebase-messaging-sw.js` has your real config (not the placeholder values).

**Vendor dashboard shows blank queue / "No one waiting" even though customers joined**
→ Firestore composite index is missing. Run: `firebase deploy --only firestore:indexes`
→ After deploying, refresh the vendor dashboard — the queue will populate in real time.
→ This is the most common issue when running locally before deploying indexes.

**"No active token found" on Check My Token screen**
→ Make sure mobile number is entered exactly as when joining (with country code, e.g. +919876543210).
→ Click the last-4 hint shown below the PIN field to auto-fill your default PIN.
→ Token may already be 'done' — check Firestore → tokens collection in Firebase Console.
→ The token query filters by mobile (exact match) — spacing or format differences cause misses.

**"Vendor pending approval" — vendor can't do anything**
→ Go to `/admin` → Login → Pending tab → Approve the vendor.
→ After approval, vendor logs out and back in — dashboard will show Open/Close and queue controls.

**Vercel build fails**
→ Check all `VITE_` env vars are set in Vercel project settings.
→ Run `npm run build` locally first to catch compile errors.

---

## 📞 Support
For any issues during setup, the key resources are:
- Firebase docs: https://firebase.google.com/docs
- Vercel docs: https://vercel.com/docs
- Meta WhatsApp API: https://developers.facebook.com/docs/whatsapp/cloud-api
- FCM Web setup: https://firebase.google.com/docs/cloud-messaging/js/client
