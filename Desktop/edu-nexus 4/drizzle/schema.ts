import { user, account, session, verification } from '@/auth-schema';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '@/lib/constants';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import z from 'zod';

export const userTable = user;
export const accountsTable = account;
export const sessionsTable = session;
export const verificationTable = verification;

export const courseTable = sqliteTable('course', {
  id: text().primaryKey().notNull(),
  title: text().notNull(),
  subTitle: text(),
  description: text().notNull(),
  thumbnailUrl: text(),
  instructorId: text()
    .references(() => userTable.id)
    .notNull(),
  courseCategory: text({ mode: 'text', enum: COURSE_CATEGORIES })
    .default('other')
    .notNull(),
  difficultyLevel: text({ mode: 'text', enum: COURSE_LEVELS })
    .default('beginner')
    .notNull(),
  courseDuration: text().notNull(),
  courseLanguage: text({ mode: 'text', enum: ['english', 'bangla'] })
    .default('english')
    .notNull(),
  prerequisites: text(),
  coursePrice: integer({ mode: 'number' }).notNull().default(0),
  status: text({ mode: 'text', enum: ['published', 'unpublished'] })
    .default('published')
    .notNull(),
  createdAt: integer({ mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const moduleTable = sqliteTable('module', {
  id: text().primaryKey().notNull(),
  courseId: text()
    .references(() => courseTable.id)
    .notNull(),
  title: text().notNull(),
  description: text(),
  orderIndex: integer({ mode: 'number' }).default(0),
  createdAt: integer({ mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const lessonTable = sqliteTable('lessons', {
  id: text().primaryKey().notNull(),
  moduleId: text()
    .notNull()
    .references(() => moduleTable.id),
  title: text().notNull(),
  content: text(), // could be JSON string or markdown
  durationMinutes: integer().notNull(), // in seconds or minutes
  videoUrl: text(),
  textOnly: integer({ mode: 'boolean' }).default(false),
  orderIndex: integer().default(0),
  isPreview: integer({ mode: 'boolean' }).default(false),
  createdAt: integer({ mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const enrollments = sqliteTable('enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => userTable.id),
  courseId: text('course_id')
    .notNull()
    .references(() => courseTable.id),
  enrolledAt: integer({ mode: 'timestamp' }).$defaultFn(() => new Date()),
  status: text({
    mode: 'text',
    enum: ['active', 'completed', 'cancelled'],
  }).default('active'),
});

export const assignmentTable = sqliteTable('assignment', {
  id: text('id').primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  courseId: text()
    .references(() => courseTable.id)
    .notNull(),
  dueDate: integer({ mode: 'timestamp' }).notNull(),
  createdAt: integer({ mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const assignmentSubmissionTable = sqliteTable('assignment_submission', {
  id: text('id').primaryKey(),
  assignmentId: text()
    .references(() => assignmentTable.id)
    .notNull(),
  userId: text()
    .references(() => userTable.id)
    .notNull(),
  content: text().notNull(),
  submissionUrl: text(),
  grade: integer(),
  feedback: text(),
  submittedAt: integer({ mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const TCourseSchema = createSelectSchema(courseTable);
export type TCourse = z.infer<typeof TCourseSchema>;
export const TCourseInsertSchema = createInsertSchema(courseTable);
export type TCourseInsert = z.infer<typeof TCourseInsertSchema>;

export const TModuleInsertSchema = createInsertSchema(moduleTable);
export type TModuleInsert = z.infer<typeof TModuleInsertSchema>;

export const LessonInsertSchema = createInsertSchema(lessonTable);
export type TLessonInsert = z.infer<typeof LessonInsertSchema>;
