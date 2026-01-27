import { auth } from '@/auth/auth';
import { db } from '@/drizzle/db';
import { courseTable, enrollments, TCourse } from '@/drizzle/schema';
import { TActionResponse } from '@/lib/types';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function GetMyEnrolledCoursesAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { data: null, message: 'Unauthorized', success: false };

  try {
    const data = await db
      .select()
      .from(courseTable)
      .innerJoin(enrollments, eq(courseTable.id, enrollments.courseId))
      .where(eq(enrollments.userId, session.user.id));
    return { data: data, message: '', success: true };
  } catch (error) {
    return { data: null, message: 'Something went wrong', success: false };
  }
}
