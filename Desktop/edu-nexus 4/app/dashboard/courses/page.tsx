import { CourseGrid } from '@/components/layout/course/course-grid';
import NavBar from '@/components/layout/Navbar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GetAllCourseInfoAction from '@/lib/actions/GetCourseInfoAction';
import { Search, Filter } from 'lucide-react';

const sampleCourses = [
  {
    id: '1',
    title: 'Complete Web Development Bootcamp',
    subTitle: 'From Zero to Full Stack Developer',
    description:
      'Learn HTML, CSS, JavaScript, React, Node.js, and MongoDB. Build real-world projects and become a professional web developer.',
    thumbnailUrl: '/web-dev-bootcamp.png',
    instructorId: 'inst1',
    instructorName: 'Sarah Johnson',
    courseCategory: 'programming',
    difficultyLevel: 'beginner' as const,
    courseDuration: '12 weeks',
    courseLanguage: 'english' as const,
    coursePrice: 299,
    status: 'published' as const,
  },
  {
    id: '2',
    title: 'Advanced React & TypeScript',
    subTitle: 'Master Modern Frontend Development',
    description:
      'Deep dive into React hooks, context, TypeScript integration, testing, and performance optimization techniques.',
    thumbnailUrl: '/react-typescript-programming.png',
    instructorId: 'inst2',
    instructorName: 'Michael Chen',
    courseCategory: 'programming',
    difficultyLevel: 'advanced' as const,
    courseDuration: '8 weeks',
    courseLanguage: 'english' as const,
    coursePrice: 199,
    status: 'published' as const,
  },
  {
    id: '3',
    title: 'Digital Marketing Fundamentals',
    subTitle: 'Grow Your Business Online',
    description:
      'Learn SEO, social media marketing, email campaigns, and analytics to build a successful digital marketing strategy.',
    thumbnailUrl: '/digital-marketing-growth.png',
    instructorId: 'inst3',
    instructorName: 'Emily Rodriguez',
    courseCategory: 'marketing',
    difficultyLevel: 'beginner' as const,
    courseDuration: '6 weeks',
    courseLanguage: 'english' as const,
    coursePrice: 149,
    status: 'published' as const,
  },
  {
    id: '4',
    title: 'Data Science with Python',
    subTitle: 'Analytics and Machine Learning',
    description:
      'Master data analysis, visualization, and machine learning using Python, pandas, matplotlib, and scikit-learn.',
    thumbnailUrl: '/data-science-python-analytics.png',
    instructorId: 'inst4',
    instructorName: 'Dr. James Wilson',
    courseCategory: 'data-science',
    difficultyLevel: 'intermediate' as const,
    courseDuration: '10 weeks',
    courseLanguage: 'english' as const,
    coursePrice: 249,
    status: 'published' as const,
  },
  {
    id: '5',
    title: 'UI/UX Design Masterclass',
    subTitle: 'Create Beautiful User Experiences',
    description:
      'Learn design principles, user research, wireframing, prototyping, and design systems using Figma and Adobe XD.',
    thumbnailUrl: '/ui-ux-design-figma-creative.png',
    instructorId: 'inst5',
    instructorName: 'Alex Thompson',
    courseCategory: 'design',
    difficultyLevel: 'intermediate' as const,
    courseDuration: '7 weeks',
    courseLanguage: 'english' as const,
    coursePrice: 179,
    status: 'published' as const,
  },
  {
    id: '6',
    title: 'Photography Basics',
    subTitle: 'Capture Stunning Photos',
    description:
      'Learn composition, lighting, camera settings, and post-processing techniques to take your photography to the next level.',
    thumbnailUrl: '/placeholder-s7n8u.png',
    instructorId: 'inst6',
    instructorName: 'Lisa Park',
    courseCategory: 'creative',
    difficultyLevel: 'beginner' as const,
    courseDuration: '4 weeks',
    courseLanguage: 'english' as const,
    coursePrice: 0,
    status: 'published' as const,
  },
];

export default async function page() {
  const courseData = await GetAllCourseInfoAction();

  return (
    <main className='bg-background min-h-screen'>
      {/* Header */}
      <header className='bg-card mt-16 border-b border-border'>
        <div className='mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl'>
          <div className='text-center'>
            <h1
              className='mb-4 font-bold text-card-foreground text-4xl'
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Discover Amazing Courses
            </h1>
            <p
              className='mx-auto max-w-2xl text-muted-foreground text-lg'
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Expand your skills and knowledge with our carefully curated
              selection of courses taught by industry experts.
            </p>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className='mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl'>
        <div className='flex md:flex-row flex-col gap-4 mb-8'>
          <div className='flex gap-4'>
            <Select>
              <SelectTrigger className='w-48'>
                <Filter className='mr-2 w-4 h-4' />
                <SelectValue placeholder='Category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Categories</SelectItem>
                <SelectItem value='programming'>Programming</SelectItem>
                <SelectItem value='design'>Design</SelectItem>
                <SelectItem value='marketing'>Marketing</SelectItem>
                <SelectItem value='data-science'>Data Science</SelectItem>
                <SelectItem value='creative'>Creative</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='Difficulty' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Levels</SelectItem>
                <SelectItem value='beginner'>Beginner</SelectItem>
                <SelectItem value='intermediate'>Intermediate</SelectItem>
                <SelectItem value='advanced'>Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Course Grid */}
        <CourseGrid courses={courseData} />
      </div>
    </main>
  );
}
