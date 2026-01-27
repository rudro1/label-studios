'use server';

import { auth } from '@/auth/auth';
import { db } from '@/drizzle/db';
import { nanoid } from 'nanoid';
import {
  courseTable,
  TCourseInsert,
  TCourseInsertSchema,
  TCourseSchema,
  type TCourse,
} from '@/drizzle/schema';
import { TActionResponse } from '@/lib/types';
import { headers } from 'next/headers';

export async function CreateCourseAction(
  courseInfo: TCourseInsert
): Promise<TActionResponse<null>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return { message: 'Unauthorized', data: null, success: false };
  const parsedData = TCourseInsertSchema.safeParse(courseInfo);
  if (!parsedData.success) {
    console.error(parsedData.error);
    return { data: null, message: 'Invalid Data', success: false };
  }

  try {
    courseInfo.id = nanoid(10);
    courseInfo.instructorId = session.user.id;
    await db.insert(courseTable).values(courseInfo);
    return { success: true, data: null, message: 'Course Created Succesfuly!' };
  } catch (error) {
    console.error(error);
    return { success: false, data: null, message: 'Unable to create course!' };
  }
}
