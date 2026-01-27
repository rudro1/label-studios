'use server';

import { db } from '@/drizzle/db';
import { courseTable, TCourse } from '@/drizzle/schema';

export default async function GetAllCourseInfoAction() {
  try {
    const data = await db.select().from(courseTable);
    return data;
  } catch (error) {
    console.error(error);
    return [] as TCourse[];
  }
}
