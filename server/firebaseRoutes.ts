import type { Express } from "express";
import { verifyFirebaseToken } from "./firebaseAuth";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

export function setupFirebaseAuthRoutes(app: Express) {
  // Get current user data - Firebase version
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // For now, return null to force client to handle auth state
      res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create/sync user after Firebase auth
  app.post('/api/auth/sync-user', async (req: any, res) => {
    try {
      const { uid, email, displayName } = req.body;
      
      if (!uid || !email) {
        return res.status(400).json({ message: "UID and email are required" });
      }

      // First try to get user by Firebase UID
      let user = await storage.getUser(uid);
      
      // If user doesn't exist by UID, check if there's an existing user with this email
      if (!user) {
        const existingUser = await storage.getUserByEmail(email);
        
        if (existingUser) {
          // There's an existing user with this email but different ID
          // For now, just use the existing user account as-is
          // This maintains compatibility while avoiding foreign key constraint issues
          console.log(`Found existing user ${existingUser.id} for email ${email}, using existing account`);
          user = existingUser;
        } else {
          // Create completely new user
          const nameParts = displayName ? displayName.split(' ') : email.split('@')[0].split('.');
          
          user = await storage.upsertUser({
            id: uid,
            email: email,
            firstName: nameParts[0] || email.split('@')[0],
            lastName: nameParts.slice(1).join(' ') || '',
            role: 'student', // Default role
          });
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

  // Update user profile
  app.put('/api/auth/user', verifyFirebaseToken, async (req: any, res) => {
    try {
      const firebaseUid = req.user.claims.sub;
      const { firstName, lastName, preferences } = req.body;

      const user = await storage.getUser(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        firstName,
        lastName,
        preferences,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
}