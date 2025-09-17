# Firebase Authentication Implementation Guide

## Task: Replace Replit Auth with Firebase Authentication

### Current System Analysis
- Uses `varchar("id")` for user IDs (compatible with Firebase UIDs)
- Has role-based access control (student, instructor, admin)
- Session-based authentication with PostgreSQL session store
- Existing middleware: `isAuthenticated`, `requireRole`, `requireExamOwnership`

### Implementation Steps

#### 1. Server-Side Changes
**Files to Update:**
- `server/firebaseAuth.ts` (NEW) - Firebase admin setup
- `server/routes.ts` - Replace auth routes and middleware
- `server/roleAuth.ts` - Update to work with Firebase tokens

**Key Requirements:**
- **PRESERVE existing user ID format** - Firebase UIDs are strings, current schema uses `varchar("id")`
- Keep role-based access control system
- Maintain session management for better UX
- Replace Replit Auth middleware with Firebase token verification

#### 2. Frontend Changes
**Files to Update:**
- `client/src/hooks/useAuth.ts` - Replace with Firebase auth hooks
- `client/src/lib/authUtils.ts` - Update error handling for Firebase
- `client/src/components/layout/app-layout.tsx` - Update logout handling
- `client/src/pages/landing.tsx` (if exists) - Add Firebase login UI

**Key Requirements:**
- Implement Firebase email/password authentication
- Add social login options (Google, GitHub)
- Maintain existing role-based UI logic
- Keep accessibility features and screen reader support

#### 3. Database Schema (CRITICAL)
**DO NOT CHANGE:**
- User ID column type (`varchar("id")`) - Firebase UIDs are strings
- Existing foreign key relationships
- Role enum values

**Environment Variables Needed:**
```bash
# Firebase Client (Frontend)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id

# Firebase Admin (Backend)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_ADMIN_PROJECT_ID=project-id
```

#### 4. Authentication Flow
1. User signs up/logs in via Firebase
2. Frontend gets Firebase ID token
3. Backend verifies token and gets/creates user in database
4. Backend maintains session for role-based access
5. Existing role middleware continues to work

#### 5. Migration Strategy
- **Phase 1:** Add Firebase alongside Replit Auth
- **Phase 2:** Update all auth calls to use Firebase
- **Phase 3:** Remove Replit Auth dependencies
- **Phase 4:** Test complete authentication flow

### Success Criteria
- [ ] Users can sign up with email/password
- [ ] Users can log in with existing and new accounts
- [ ] Role-based access control works (student, instructor, admin)
- [ ] All exam functionality works with new auth
- [ ] Voice commands and accessibility features work
- [ ] No data loss during migration