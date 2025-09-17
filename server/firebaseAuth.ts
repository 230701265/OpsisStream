import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { RequestHandler } from 'express';

// Initialize Firebase Admin SDK only if credentials are available
let firebaseInitialized = false;

if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    
    if (!privateKey || !clientEmail || !projectId) {
      console.log('Firebase Admin credentials not found, continuing without Firebase setup');
    } else {
      // Try to format the private key properly
      let formattedPrivateKey = privateKey;
      
      // Handle escaped newlines if they exist
      if (privateKey.includes('\\n')) {
        formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Ensure the key has proper BEGIN/END markers
      if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('Private key missing BEGIN marker, skipping Firebase Admin setup');
        console.log('Continuing without Firebase Admin - client-side auth will still work');
      } else {
      
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedPrivateKey,
          }),
        });
        
        firebaseInitialized = true;
        console.log('Firebase Admin initialized successfully');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    console.log('Application will continue with fallback to Replit auth');
  }
}

export const adminAuth = () => {
  try {
    if (!firebaseInitialized) {
      return null;
    }
    return getAuth();
  } catch (error) {
    console.error('Firebase Admin not initialized');
    return null;
  }
};

// Middleware to verify Firebase ID tokens
export const verifyFirebaseToken: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const auth = adminAuth();
    if (!auth) {
      return res.status(500).json({ message: 'Firebase Admin not initialized' });
    }
    
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Attach user info to request
    req.user = {
      claims: {
        sub: decodedToken.uid,
        email: decodedToken.email,
      }
    };
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};