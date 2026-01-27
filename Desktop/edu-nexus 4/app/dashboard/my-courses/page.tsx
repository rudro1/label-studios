import { auth } from '@/auth/auth';
import { CourseCard } from '@/components/layout/course/course-card';
import CourseCardAdmin from '@/components/layout/course/course-card-admin';
import { db } from '@/drizzle/db';
import { courseTable, enrollments } from '@/drizzle/schema';
import GetAllCourseInfoAction from '@/lib/actions/GetCourseInfoAction';
import { Item } from '@radix-ui/react-select';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import CourseCardUser from './course-card-user';

export default async function page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const enrollmentData = await db
    .select()
    .from(courseTable)
    .innerJoin(enrollments, eq(courseTable.id, enrollments.courseId))
    .where(eq(enrollments.userId, session.user.id));

  return (
    <section className='my-5'>
      <h1 className='text-3xl'>Courses</h1>
      <p className='text-muted-foreground'>
        A list of all courses on the platform
      </p>
      <div className='gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-4 my-5'>
        {enrollmentData.map((data, index) => (
          <CourseCardUser key={index} courseInfo={data.course} />
        ))}
      </div>
    </section>
  );
}
