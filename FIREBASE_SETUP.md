# Firebase — retired

The homepage no longer loads Firebase. Visit notes that stay in the browser use the `fkti_analytics` localStorage key. Do not add the Firebase SDK back. Follow `ARCHITECTURE.md`.

---

# Firebase Setup for Centralized Analytics

## Why Firebase?
Firebase Firestore provides free, centralized storage that works across all devices, networks, and locations. Your analytics will sync in real-time across laptops, mobiles, tablets, and any device accessing your website.

## Setup Instructions (5 minutes)

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project" or "Create a project"
3. Enter project name: `fkti-analytics` (or any name you prefer)
4. Disable Google Analytics (optional - not needed for this)
5. Click "Create project"

### Step 2: Enable Firestore Database
1. In Firebase Console, click "Firestore Database" in the left menu
2. Click "Create database"
3. Select "Start in test mode" (for now - you can add security rules later)
4. Choose a location (closest to your users)
5. Click "Enable"

### Step 3: Get Firebase Configuration
1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Register app name: `FKTI Website`
6. Copy the `firebaseConfig` object that appears

### Step 4: Update index.html
1. Open `index.html` in your editor
2. Find this section (around line 10-20):
   ```javascript
   const firebaseConfig = {
       apiKey: "AIzaSyDummyKeyReplaceWithYourOwn",
       authDomain: "fkti-analytics.firebaseapp.com",
       projectId: "fkti-analytics",
       storageBucket: "fkti-analytics.appspot.com",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abcdef"
   };
   ```
3. Replace with your actual Firebase config from Step 3
4. Save the file

### Step 5: Test It!
1. Open your website
2. Open browser console (F12)
3. You should see: `✅ Firebase initialized for centralized analytics`
4. Visit from different devices/networks
5. Check analytics dashboard - counts should sync!

## Security Rules (Optional - Recommended for Production)

In Firebase Console > Firestore Database > Rules, add:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /analytics/{document} {
      // Allow read/write to analytics collection
      allow read, write: if true; // For now - add authentication later
    }
  }
}
```

## Troubleshooting

**Problem:** "Firebase not configured - using localStorage only"
- **Solution:** Make sure you replaced the dummy config with your actual Firebase config

**Problem:** "Firebase save failed"
- **Solution:** Check Firestore is enabled and rules allow read/write

**Problem:** Analytics not syncing
- **Solution:** 
  1. Check browser console for errors
  2. Verify Firebase config is correct
  3. Make sure Firestore database is created
  4. Check network tab to see if requests are being made

## Free Tier Limits
- **Firestore:** 50,000 reads/day, 20,000 writes/day (FREE)
- **Storage:** 1 GB (FREE)
- Perfect for analytics! You won't hit these limits easily.

## Need Help?
- Firebase Docs: https://firebase.google.com/docs/firestore
- Firebase Console: https://console.firebase.google.com


