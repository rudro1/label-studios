'use server';
import { db } from '@/drizzle/db';
import {
  lessonTable,
  moduleTable,
  TLessonInsert,
  TModuleInsert,
} from '@/drizzle/schema';
import { nanoid } from 'nanoid';

export async function AddModuleAction(moduleInfo: TModuleInsert) {
  try {
    moduleInfo.id = nanoid(10);
    await db.insert(moduleTable).values(moduleInfo);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function AddLessonAction(lessonInfo: TLessonInsert) {
  try {
    lessonInfo.id = nanoid(10);
    await db.insert(lessonTable).values(lessonInfo);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
