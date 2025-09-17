import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { verifyFirebaseToken } from "./firebaseAuth";
import { hybridAuth } from "./hybridAuth";
import { setupFirebaseAuthRoutes } from "./firebaseRoutes";
import { requireRole, requireExamOwnership, requirePublishedExam, requireAttemptAccess } from "./roleAuth";
import { insertExamSchema, insertQuestionSchema, insertAttemptSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - keep both for migration
  await setupAuth(app);
  
  // Firebase auth routes (new)
  setupFirebaseAuthRoutes(app);

  // Exam routes
  app.get('/api/exams', hybridAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let exams;
      if (user.role === 'instructor') {
        exams = await storage.getExamsByInstructor(userId);
      } else {
        exams = await storage.getActiveExamsForStudent(userId);
      }
      
      res.json(exams);
    } catch (error) {
      console.error("Error fetching exams:", error);
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  app.get('/api/exams/:id', hybridAuth, requirePublishedExam(), async (req: any, res) => {
    try {
      // exam and currentUser are attached by middleware
      res.json(req.exam);
    } catch (error) {
      console.error("Error fetching exam:", error);
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  app.post('/api/exams', hybridAuth, requireRole(['instructor', 'admin']), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const examData = insertExamSchema.parse({
        ...req.body,
        instructorId: userId,
      });

      const exam = await storage.createExam(examData);
      
      await storage.createAuditEntry({
        userId,
        action: "exam_created",
        entityType: "exam",
        entityId: exam.id,
        metadata: { title: exam.title },
      });

      res.status(201).json(exam);
    } catch (error) {
      console.error("Error creating exam:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid exam data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  // Update exam (instructors only)
  app.put('/api/exams/:id', hybridAuth, requireExamOwnership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertExamSchema.partial().parse(req.body);
      
      const updatedExam = await storage.updateExam(id, updates);
      
      await storage.createAuditEntry({
        userId: req.user.claims.sub,
        action: "exam_updated",
        entityType: "exam",
        entityId: id,
        metadata: { updates },
      });

      res.json(updatedExam);
    } catch (error) {
      console.error("Error updating exam:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid exam data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update exam" });
    }
  });

  // Delete exam (instructors only)
  app.delete('/api/exams/:id', hybridAuth, requireExamOwnership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteExam(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      await storage.createAuditEntry({
        userId: req.user.claims.sub,
        action: "exam_deleted",
        entityType: "exam",
        entityId: id,
        metadata: {},
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting exam:", error);
      res.status(500).json({ message: "Failed to delete exam" });
    }
  });

  // Get exam results (instructors only)
  app.get('/api/exams/:id/results', hybridAuth, requireExamOwnership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const results = await storage.getExamResults(id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching exam results:", error);
      res.status(500).json({ message: "Failed to fetch exam results" });
    }
  });

  // Question routes
  app.get('/api/exams/:examId/questions', hybridAuth, async (req: any, res) => {
    try {
      const { examId } = req.params;
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const questions = await storage.getQuestionsByExam(examId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/exams/:examId/questions', hybridAuth, requireExamOwnership(), async (req: any, res) => {
    try {
      const { examId } = req.params;

      const questionData = insertQuestionSchema.parse({
        ...req.body,
        examId,
      });

      const question = await storage.createQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid question data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Attempt routes
  app.post('/api/exams/:examId/attempts', hybridAuth, requireRole(['student', 'instructor']), requirePublishedExam(), async (req: any, res) => {
    try {
      const { examId } = req.params;
      const userId = req.user.claims.sub;
      const exam = req.exam; // attached by middleware

      // Check for existing active attempt
      const existingAttempt = await storage.getActiveAttempt(userId, examId);
      if (existingAttempt) {
        return res.json(existingAttempt);
      }

      const attemptData = insertAttemptSchema.parse({
        examId,
        userId,
        startedAt: new Date(),
        timeLimit: exam.timeLimit,
      });

      const attempt = await storage.createAttempt(attemptData);
      
      await storage.createAuditEntry({
        userId,
        action: "exam_started",
        entityType: "attempt",
        entityId: attempt.id,
        metadata: { examId, examTitle: exam.title },
      });

      res.status(201).json(attempt);
    } catch (error) {
      console.error("Error creating attempt:", error);
      res.status(500).json({ message: "Failed to start exam" });
    }
  });

  app.put('/api/attempts/:id/answers', hybridAuth, requireAttemptAccess(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const attempt = req.attempt; // attached by middleware

      if (attempt.status !== 'in_progress') {
        return res.status(400).json({ message: "Attempt is no longer active" });
      }

      const updatedAttempt = await storage.updateAttempt(id, {
        answers: req.body.answers,
      });

      res.json(updatedAttempt);
    } catch (error) {
      console.error("Error saving answers:", error);
      res.status(500).json({ message: "Failed to save answers" });
    }
  });

  app.post('/api/attempts/:id/submit', hybridAuth, requireAttemptAccess(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const attempt = req.attempt; // attached by middleware

      if (attempt.status !== 'in_progress') {
        return res.status(400).json({ message: "Attempt is no longer active" });
      }

      // Check time limit
      const now = new Date();
      const startTime = new Date(attempt.startedAt);
      const timeElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60); // minutes
      
      if (attempt.timeLimit && timeElapsed > attempt.timeLimit) {
        return res.status(400).json({ message: "Time limit exceeded" });
      }

      const updatedAttempt = await storage.updateAttempt(id, {
        submittedAt: now,
        status: 'submitted',
        answers: req.body.answers || attempt.answers,
      });

      await storage.createAuditEntry({
        userId,
        action: "exam_submitted",
        entityType: "attempt",
        entityId: id,
        metadata: { 
          submittedAt: now.toISOString(),
          timeElapsed: Math.round(timeElapsed),
        },
      });

      res.json(updatedAttempt);
    } catch (error) {
      console.error("Error submitting attempt:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  app.get('/api/attempts/:id', hybridAuth, requireAttemptAccess(), async (req: any, res) => {
    try {
      // attempt is attached by middleware
      res.json(req.attempt);
    } catch (error) {
      console.error("Error fetching attempt:", error);
      res.status(500).json({ message: "Failed to fetch attempt" });
    }
  });

  app.get('/api/user/attempts', hybridAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attempts = await storage.getAttemptsByUser(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching user attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  // Stats endpoint - different stats based on role
  app.get('/api/user/stats', hybridAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === 'instructor') {
        // Get instructor stats: their exams, total students, etc.
        const exams = await storage.getExamsByInstructor(userId);
        const totalExams = exams.length;
        const publishedExams = exams.filter(exam => exam.published).length;
        
        // Get total attempts across all instructor's exams
        const allResults = await Promise.all(
          exams.map(exam => storage.getExamResults(exam.id))
        );
        const totalAttempts = allResults.flat().length;
        const gradedAttempts = allResults.flat().filter(attempt => attempt.status === 'graded');
        const averageScore = gradedAttempts.length > 0 
          ? gradedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / gradedAttempts.length
          : 0;

        res.json({
          role: 'instructor',
          totalExams,
          publishedExams,
          totalStudents: new Set(allResults.flat().map(attempt => attempt.userId)).size,
          totalAttempts,
          averageScore: Math.round(averageScore * 100) / 100
        });
      } else {
        // Get student stats: their attempts, scores, etc.
        const attempts = await storage.getAttemptsByUser(userId);
        const completedAttempts = attempts.filter(attempt => attempt.status === 'graded');
        const averageScore = completedAttempts.length > 0
          ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / completedAttempts.length
          : 0;
        const totalExams = attempts.length;
        const completedExams = completedAttempts.length;
        
        res.json({
          role: 'student',
          totalExams,
          completedExams,
          averageScore: Math.round(averageScore * 100) / 100,
          recentAttempts: attempts.slice(0, 5)
        });
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin routes - User Management
  app.get('/api/admin/users', hybridAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/role', hybridAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['student', 'instructor', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createAuditEntry({
        userId: req.user.claims.sub,
        action: "user_role_updated",
        entityType: "user",
        entityId: userId,
        metadata: { newRole: role, oldRole: updatedUser.role },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/admin/users/:userId', hybridAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.claims.sub;
      
      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createAuditEntry({
        userId: adminId,
        action: "user_deleted",
        entityType: "user",
        entityId: userId,
        metadata: {},
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Generate invitation link
  app.post('/api/admin/invite', hybridAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { role, email } = req.body;
      
      if (!['student', 'instructor'].includes(role)) {
        return res.status(400).json({ message: "Invalid role for invitation" });
      }

      // Generate invitation token (simple approach - in production use proper JWT)
      const inviteToken = Buffer.from(JSON.stringify({
        role,
        email: email || null,
        createdAt: new Date().toISOString(),
        createdBy: req.user.claims.sub
      })).toString('base64');

      // Create invitation URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

      await storage.createAuditEntry({
        userId: req.user.claims.sub,
        action: "invitation_created",
        entityType: "invitation",
        entityId: inviteToken,
        metadata: { role, email, inviteUrl },
      });

      res.json({
        inviteUrl,
        role,
        email,
        expiresIn: '7 days'
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Create user directly
  app.post('/api/admin/create-user', hybridAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { email, role, firstName, lastName } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }

      if (!['student', 'instructor'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be student or instructor" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail?.(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create the user account
      const newUser = await storage.createUserAccount({
        email,
        role,
        firstName: firstName || '',
        lastName: lastName || ''
      });

      // Generate setup token
      const setupToken = Buffer.from(JSON.stringify({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: new Date().toISOString(),
        createdBy: req.user.claims.sub
      })).toString('base64');

      // Create setup URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const setupUrl = `${baseUrl}/setup/${setupToken}`;

      await storage.createAuditEntry({
        userId: req.user.claims.sub,
        action: "user_created",
        entityType: "user",
        entityId: newUser.id,
        metadata: { email, role, setupUrl },
      });

      res.json({
        user: newUser,
        setupUrl,
        message: `User created successfully. Share the setup link with ${email} to complete their account.`
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Setup user account
  app.get('/api/setup/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      // Decode setup token
      const setupData = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if setup is still valid (30 days)
      const createdAt = new Date(setupData.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        return res.status(400).json({ message: "Setup link has expired" });
      }

      // Check if user still exists
      const user = await storage.getUser(setupData.userId);
      if (!user) {
        return res.status(400).json({ message: "User account not found" });
      }

      res.json({
        valid: true,
        email: setupData.email,
        role: setupData.role,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error("Error validating setup token:", error);
      res.status(400).json({ message: "Invalid setup token" });
    }
  });

  // Accept invitation
  app.get('/api/invite/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      // Decode invitation token
      const inviteData = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if invitation is still valid (7 days)
      const createdAt = new Date(inviteData.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      res.json({
        valid: true,
        role: inviteData.role,
        email: inviteData.email
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(400).json({ message: "Invalid invitation token" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'timer_sync':
            // Broadcast timer updates to exam takers
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'timer_update',
                  attemptId: data.attemptId,
                  timeRemaining: data.timeRemaining,
                }));
              }
            });
            break;
          
          case 'exam_announcement':
            // Broadcast announcements to all connected clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'announcement',
                  message: data.message,
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  return httpServer;
}
