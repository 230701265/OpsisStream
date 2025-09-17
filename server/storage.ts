import {
  users,
  exams,
  questions,
  attempts,
  auditLog,
  type User,
  type UpsertUser,
  type Exam,
  type InsertExam,
  type Question,
  type InsertQuestion,
  type Attempt,
  type InsertAttempt,
  type AuditEntry,
  type InsertAuditEntry,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Exam operations
  createExam(exam: InsertExam): Promise<Exam>;
  getExam(id: string): Promise<Exam | undefined>;
  getExamsByInstructor(instructorId: string): Promise<Exam[]>;
  getActiveExamsForStudent(userId: string): Promise<Exam[]>;
  updateExam(id: string, updates: Partial<InsertExam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<boolean>;
  getExamResults(examId: string): Promise<Attempt[]>;

  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByExam(examId: string): Promise<Question[]>;
  updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question | undefined>;

  // Attempt operations
  createAttempt(attempt: InsertAttempt): Promise<Attempt>;
  getAttempt(id: string): Promise<Attempt | undefined>;
  getAttemptsByUser(userId: string): Promise<Attempt[]>;
  updateAttempt(id: string, updates: Partial<InsertAttempt>): Promise<Attempt | undefined>;
  getActiveAttempt(userId: string, examId: string): Promise<Attempt | undefined>;

  // Audit operations
  createAuditEntry(entry: InsertAuditEntry): Promise<AuditEntry>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  createUserAccount(userData: { email: string; role: string; firstName?: string; lastName?: string }): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Exam operations
  async createExam(exam: InsertExam): Promise<Exam> {
    const [newExam] = await db.insert(exams).values(exam).returning();
    return newExam;
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async getExamsByInstructor(instructorId: string): Promise<Exam[]> {
    return await db
      .select()
      .from(exams)
      .where(eq(exams.instructorId, instructorId))
      .orderBy(desc(exams.createdAt));
  }

  async getActiveExamsForStudent(userId: string): Promise<Exam[]> {
    return await db
      .select()
      .from(exams)
      .where(eq(exams.published, true))
      .orderBy(desc(exams.createdAt));
  }

  async updateExam(id: string, updates: Partial<InsertExam>): Promise<Exam | undefined> {
    const [updatedExam] = await db
      .update(exams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(exams.id, id))
      .returning();
    return updatedExam;
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question).returning();
    return newQuestion;
  }

  async getQuestionsByExam(examId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.examId, examId))
      .orderBy(asc(questions.order));
  }

  async updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [updatedQuestion] = await db
      .update(questions)
      .set(updates)
      .where(eq(questions.id, id))
      .returning();
    return updatedQuestion;
  }

  // Attempt operations
  async createAttempt(attempt: InsertAttempt): Promise<Attempt> {
    const [newAttempt] = await db.insert(attempts).values(attempt).returning();
    return newAttempt;
  }

  async getAttempt(id: string): Promise<Attempt | undefined> {
    const [attempt] = await db.select().from(attempts).where(eq(attempts.id, id));
    return attempt;
  }

  async getAttemptsByUser(userId: string): Promise<Attempt[]> {
    return await db
      .select()
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .orderBy(desc(attempts.createdAt));
  }

  async updateAttempt(id: string, updates: Partial<InsertAttempt>): Promise<Attempt | undefined> {
    const [updatedAttempt] = await db
      .update(attempts)
      .set(updates)
      .where(eq(attempts.id, id))
      .returning();
    return updatedAttempt;
  }

  async getActiveAttempt(userId: string, examId: string): Promise<Attempt | undefined> {
    const [attempt] = await db
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          eq(attempts.examId, examId),
          eq(attempts.status, "in_progress")
        )
      );
    return attempt;
  }

  // Audit operations
  async createAuditEntry(entry: InsertAuditEntry): Promise<AuditEntry> {
    const [newEntry] = await db.insert(auditLog).values(entry).returning();
    return newEntry;
  }

  async deleteExam(id: string): Promise<boolean> {
    const result = await db.delete(exams).where(eq(exams.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getExamResults(examId: string): Promise<Attempt[]> {
    return await db
      .select()
      .from(attempts)
      .where(eq(attempts.examId, examId))
      .orderBy(desc(attempts.submittedAt));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId));
    return (result.rowCount || 0) > 0;
  }

  async createUserAccount(userData: { email: string; role: string; firstName?: string; lastName?: string }): Promise<User> {
    // Generate a temporary unique ID for the user account
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [newUser] = await db
      .insert(users)
      .values({
        id: tempId,
        email: userData.email,
        role: userData.role as any,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: null,
      })
      .returning();
    
    return newUser;
  }
}

export const storage = new DatabaseStorage();
