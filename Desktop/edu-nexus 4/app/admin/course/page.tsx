import { CourseCard } from '@/components/layout/course/course-card';
import CourseCardAdmin from '@/components/layout/course/course-card-admin';
import GetAllCourseInfoAction from '@/lib/actions/GetCourseInfoAction';
import { Item } from '@radix-ui/react-select';
import React from 'react';

export default async function page() {
  const courseData = await GetAllCourseInfoAction();
  return (
    <section className='my-5'>
      <h1 className='text-3xl'>Courses</h1>
      <p className='text-muted-foreground'>
        A list of all courses on the platform
      </p>
      <div className='gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-4 my-5'>
        {courseData.map((course, index) => (
          <CourseCardAdmin key={index} courseInfo={course} />
        ))}
      </div>
    </section>
  );
}
