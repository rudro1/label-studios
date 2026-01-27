import { TCourse } from '@/drizzle/schema';
import { CourseCard } from './course-card';

interface CourseGridProps {
  courses: TCourse[];
}

export function CourseGrid({ courses }: CourseGridProps) {
  // Filter only published courses

  if (courses.length === 0) {
    return (
      <div className='py-12 text-center'>
        <h3
          className='mb-2 font-semibold text-muted-foreground text-lg'
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          No courses available
        </h3>
        <p
          className='text-muted-foreground'
          style={{ fontFamily: 'var(--font-source-sans)' }}
        >
          Check back later for new courses!
        </p>
      </div>
    );
  }

  return (
    <div className='gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {courses.map((course) => (
        <CourseCard key={course.id} courseData={course} />
      ))}
    </div>
  );
}
