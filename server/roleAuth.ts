import type { RequestHandler } from "express";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Express.Request {
  user: {
    claims: {
      sub: string;
      email?: string;
    };
  };
}

// Middleware to check if user has required role
export function requireRole(roles: string[]): RequestHandler {
  return async (req: any, res, next) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Access denied. Required role: ${roles.join(' or ')}, your role: ${user.role}` 
        });
      }

      // Attach user to request for easy access
      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Error checking user role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Helper to check if user owns an exam
export function requireExamOwnership(): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const examId = req.params.examId || req.params.id;
      const userId = req.user.claims.sub;

      if (!examId) {
        return res.status(400).json({ message: "Exam ID required" });
      }

      const exam = await storage.getExam(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admins can access any exam, instructors can only access their own
      if (user.role === 'admin' || exam.instructorId === userId) {
        req.exam = exam;
        req.currentUser = user;
        next();
      } else {
        return res.status(403).json({ message: "You can only access your own exams" });
      }
    } catch (error) {
      console.error("Error checking exam ownership:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Helper to check if student can access published exam
export function requirePublishedExam(): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const examId = req.params.examId || req.params.id;
      const userId = req.user.claims.sub;

      if (!examId) {
        return res.status(400).json({ message: "Exam ID required" });
      }

      const exam = await storage.getExam(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admins can access any exam
      if (user.role === 'admin') {
        req.exam = exam;
        req.currentUser = user;
        return next();
      }

      // Instructors can access exams they own (published or unpublished)
      if (user.role === 'instructor') {
        if (exam.instructorId === userId) {
          req.exam = exam;
          req.currentUser = user;
          return next();
        } else {
          // Instructors can only take published exams they don't own
          if (!exam.published) {
            return res.status(403).json({ message: "This exam is not yet available" });
          }
        }
      }

      // Students can only access published exams
      if (user.role === 'student' && !exam.published) {
        return res.status(403).json({ message: "This exam is not yet available" });
      }

      req.exam = exam;
      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Error checking exam access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Helper to check if user can view attempt results
export function requireAttemptAccess(): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const attemptId = req.params.attemptId || req.params.id;
      const userId = req.user.claims.sub;

      if (!attemptId) {
        return res.status(400).json({ message: "Attempt ID required" });
      }

      const attempt = await storage.getAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the exam to check instructor
      const exam = await storage.getExam(attempt.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Allow access if:
      // 1. User is the student who took the attempt
      // 2. User is the instructor who created the exam
      // 3. User is an admin
      if (attempt.userId === userId || exam.instructorId === userId || user.role === 'admin') {
        req.attempt = attempt;
        req.exam = exam;
        req.currentUser = user;
        next();
      } else {
        return res.status(403).json({ message: "You can only access your own exam attempts" });
      }
    } catch (error) {
      console.error("Error checking attempt access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}