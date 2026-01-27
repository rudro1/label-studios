'use server';
import { auth } from '@/auth/auth';
import { db } from '@/drizzle/db';
import { courseTable, enrollments, TCourse } from '@/drizzle/schema';
import { TActionResponse } from '@/lib/types';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { headers } from 'next/headers';

export async function EnrolleOnCoursesAction({
  courseId,
}: {
  courseId: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { data: null, message: 'Unauthorized', success: false };
  const alreadyEnrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, session.user.id),
        eq(enrollments.courseId, courseId)
      )
    );
  if (alreadyEnrolled.length > 0)
    return { data: null, message: 'Already Enrolled!', success: false };
  try {
    const id = nanoid(10);
    await db.insert(enrollments).values({
      courseId,
      id,
      userId: session.session.userId,
    });
    return { data: null, message: 'Enrollment Succesful!', success: true };
  } catch (error) {
    return { data: null, message: 'Something went wrong', success: false };
  }
}
