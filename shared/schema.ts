import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["student", "instructor", "admin"] }).notNull().default("student"),
  preferences: jsonb("preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exams table
export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  timeLimit: integer("time_limit"), // in minutes
  published: boolean("published").notNull().default(false),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  type: varchar("type", { enum: ["multiple_choice", "true_false", "short_answer", "essay"] }).notNull(),
  content: jsonb("content").notNull(), // stores question text, options, etc.
  correctAnswer: jsonb("correct_answer"),
  points: real("points").notNull().default(1),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exam attempts table
export const attempts = pgTable("attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: uuid("exam_id").notNull().references(() => exams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at").notNull(),
  submittedAt: timestamp("submitted_at"),
  timeLimit: integer("time_limit"), // copied from exam at start
  answers: jsonb("answers").default({}),
  score: real("score"),
  status: varchar("status", { enum: ["in_progress", "submitted", "graded"] }).notNull().default("in_progress"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log table
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"),
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  exams: many(exams),
  attempts: many(attempts),
  auditEntries: many(auditLog),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  instructor: one(users, {
    fields: [exams.instructorId],
    references: [users.id],
  }),
  questions: many(questions),
  attempts: many(attempts),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id],
  }),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  exam: one(exams, {
    fields: [attempts.examId],
    references: [exams.id],
  }),
  user: one(users, {
    fields: [attempts.userId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
export const insertAttemptSchema = createInsertSchema(attempts).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Exam = typeof exams.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Attempt = typeof attempts.$inferSelect;
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type AuditEntry = typeof auditLog.$inferSelect;
export type InsertAuditEntry = z.infer<typeof insertAuditLogSchema>;
