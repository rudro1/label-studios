'use server';

import { db } from '@/drizzle/db';
import { assignmentSubmissionTable } from '@/drizzle/schema';
import { auth } from '@/auth/auth';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { headers } from 'next/headers';

export async function createAssignmentSubmission(data: {
  assignmentId: string;
  content: string;
  submissionUrl?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const submission = await db
      .insert(assignmentSubmissionTable)
      .values({
        id: nanoid(10),
        assignmentId: data.assignmentId,
        userId: session.user.id,
        content: data.content,
        submissionUrl: data.submissionUrl,
      })
      .returning()
      .get();

    revalidatePath('/dashboard/assignments');
    return { success: true, data: submission };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
