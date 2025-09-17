# Firebase Authentication Setup

## Quick Setup Instructions for Firebase Auth

### 1. Firebase Console Setup
1. Go to https://console.firebase.google.com/
2. Create a new project or use existing one
3. Enable Authentication in the Firebase console
4. Enable sign-in methods you want (Email/Password, Google, etc.)
5. Get your Firebase config object from Project Settings > General > Your apps

### 2. Environment Variables Needed
```bash
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcd1234

# For server-side admin SDK
FIREBASE_ADMIN_KEY_JSON={"type":"service_account",...}
```

### 3. Implementation Tasks
- Replace Replit Auth middleware with Firebase Auth
- Update user schema to work with Firebase UIDs
- Update frontend authentication hooks
- Keep existing user roles and permissions system
- Maintain session management for better UX

### 4. Free Tier Limits
- 50,000 monthly active users
- Unlimited email/password signups
- Social logins included
- No SMS costs for email-based auth