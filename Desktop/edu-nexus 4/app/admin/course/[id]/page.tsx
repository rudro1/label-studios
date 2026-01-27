import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion as AccordionPrimitive } from 'radix-ui';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import {
  Star,
  Users,
  Clock,
  PlayCircle,
  CheckCircle,
  Lock,
  ChevronDownIcon,
  CheckCircle2,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/drizzle/db';
import { courseTable, lessonTable, moduleTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import AddModuleButton from './_components/add-module';
import AddLessonButton from './_components/add-lesson';

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;
  const [course] = await db
    .select()
    .from(courseTable)
    .where(eq(courseTable.id, id));

  if (!course) {
    return (
      <div className='py-12 text-center'>
        <h1 className='font-bold text-2xl'>Course not found</h1>
        <p className='mt-2 text-muted-foreground'>
          The course you're looking for doesn't exist.
        </p>
        <Button asChild className='mt-4'>
          <Link href='/courses'>Back to Courses</Link>
        </Button>
      </div>
    );
  }
  const modules = await db
    .select()
    .from(moduleTable)
    .leftJoin(lessonTable, eq(moduleTable.id, lessonTable.moduleId))
    .where(eq(moduleTable.courseId, course.id));

  const lessons = [
    {
      id: 1,
      title: 'Introduction to the Course',
      duration: '5 min',
      completed: true,
      locked: false,
    },
    {
      id: 2,
      title: 'Setting Up Your Development Environment',
      duration: '15 min',
      completed: true,
      locked: false,
    },
    {
      id: 3,
      title: 'HTML Fundamentals',
      duration: '25 min',
      completed: true,
      locked: false,
    },
    {
      id: 4,
      title: 'CSS Basics and Styling',
      duration: '30 min',
      completed: true,
      locked: false,
    },
    {
      id: 5,
      title: 'CSS Layout with Flexbox',
      duration: '35 min',
      completed: false,
      locked: false,
    },
    {
      id: 6,
      title: 'CSS Grid System',
      duration: '40 min',
      completed: false,
      locked: false,
    },
    {
      id: 7,
      title: 'Responsive Design Principles',
      duration: '30 min',
      completed: false,
      locked: false,
    },
    {
      id: 8,
      title: 'JavaScript Introduction',
      duration: '20 min',
      completed: false,
      locked: true,
    },
    {
      id: 9,
      title: 'Variables and Data Types',
      duration: '25 min',
      completed: false,
      locked: true,
    },
    {
      id: 10,
      title: 'Functions and Scope',
      duration: '35 min',
      completed: false,
      locked: true,
    },
  ];

  return (
    <div className='space-y-6 my-5'>
      {/* Course Header */}
      <div className='gap-6 grid lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <div>
            <div className='flex items-center space-x-2 mb-2'>
              <Badge variant='secondary'>{course.difficultyLevel}</Badge>
              <Badge variant='outline'>{course.courseCategory}</Badge>
            </div>
            <h1 className='font-bold text-3xl'>{course.title}</h1>
            <p className='mt-2 text-muted-foreground'>{course.description}</p>
          </div>

          <div className='flex items-center space-x-6 text-sm'>
            <div className='flex items-center space-x-1'>
              <Star className='fill-current w-4 h-4 text-yellow-400' />
              <span className='font-medium'>{5}</span>
            </div>
            <div className='flex items-center space-x-1'>
              <Users className='w-4 h-4' />
              <span>{55} students</span>
            </div>
            <div className='flex items-center space-x-1'>
              <Clock className='w-4 h-4' />
              <span>{course.courseDuration}</span>
            </div>
          </div>

          {/* <div className="space-y-2">
              <p className="font-medium text-sm">Instructor: {`Multiple`}</p>
              {course.progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{course.progress}% complete</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>
              )}
            </div> */}
        </div>

        <Card>
          <CardHeader>
            <div className='relative rounded-lg aspect-video overflow-hidden'>
              <Image
                src={'/placeholder.svg'}
                alt={course.title}
                fill
                className='object-cover'
              />
              <div className='absolute inset-0 flex justify-center items-center bg-black/20'>
                <PlayCircle className='w-12 h-12 text-white' />
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='text-center'>
              <p className='font-bold text-2xl'>Free</p>
              <p className='text-muted-foreground text-sm'>
                Full access to all content
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <AddModuleButton courseId={course.id} />
      </div>
      {/* Course Content */}
      <Tabs defaultValue='curriculum' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='curriculum'>Curriculum</TabsTrigger>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='instructor'>Instructor</TabsTrigger>
          <TabsTrigger value='reviews'>Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value='curriculum' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Course Curriculum</CardTitle>
              <CardDescription>
                {modules.length} lessons • {course.courseDuration} total length
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <Accordion
                  type='single'
                  collapsible
                  className='w-full'
                  defaultValue='3'
                >
                  {Array.from(
                    new Map(
                      modules.map((item) => [item.module.id, item.module])
                    ).values()
                  ).map((module, index) => (
                    <AccordionItem
                      value={index.toString()}
                      key={index}
                      className='my-2 p-3 rounded-lg transition'
                    >
                      <AccordionPrimitive.Header className='flex'>
                        <AccordionPrimitive.Trigger className='flex flex-1 justify-between items-center hover:bg-muted px-2 py-2 focus-visible:border-ring rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 font-semibold text-[15px] text-left leading-6 [&[data-state=open]>svg]:rotate-180 transition-all cursor-pointer'>
                          <div className='flex items-center space-x-3'>
                            {/* {lesson.completed ? (
                        <CheckCircle className='w-5 h-5 text-green-500' />
                        ) : lesson.locked ? (
                            <Lock className='w-5 h-5 text-muted-foreground' />
                            ) : ( */}
                            <PlayCircle className='w-5 h-5 text-primary' />

                            <div>
                              <p className='font-medium'>{module.title}</p>
                              <p className='text-muted-foreground text-sm'>
                                {/* {module.?.durationMinutes ?? 0} */}
                              </p>
                            </div>
                          </div>
                          <ChevronDownIcon
                            size={16}
                            className='opacity-60 transition-transform duration-200 pointer-events-none shrink-0'
                            aria-hidden='true'
                          />
                        </AccordionPrimitive.Trigger>
                      </AccordionPrimitive.Header>
                      <AccordionContent className='flex flex-col gap-3 py-3 pb-2 text-muted-foreground'>
                        <AddLessonButton moduleId={module.id} />
                        {modules
                          .filter((item) => item.module.id === module.id)
                          .reverse()
                          .map((item, index) => (
                            <span key={index}>
                              <li className='flex justify-between items-center hover:bg-gray-100 p-2 px-5 rounded transition'>
                                <div className='flex items-center gap-2'>
                                  <Play className='w-4 h-4 text-indigo-500' />

                                  <span className='font-medium text-primary/80'>
                                    {item.lessons?.title}
                                  </span>
                                </div>

                                <Button variant='outline' className=''>
                                  Start
                                </Button>
                              </li>
                            </span>
                          ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='overview' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>What you'll learn</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='space-y-2'>
                <li className='flex items-start space-x-2'>
                  <CheckCircle className='mt-0.5 w-5 h-5 text-green-500' />
                  <span>
                    Build responsive websites using HTML, CSS, and JavaScript
                  </span>
                </li>
                <li className='flex items-start space-x-2'>
                  <CheckCircle className='mt-0.5 w-5 h-5 text-green-500' />
                  <span>Understand modern web development best practices</span>
                </li>
                <li className='flex items-start space-x-2'>
                  <CheckCircle className='mt-0.5 w-5 h-5 text-green-500' />
                  <span>Create interactive user interfaces</span>
                </li>
                <li className='flex items-start space-x-2'>
                  <CheckCircle className='mt-0.5 w-5 h-5 text-green-500' />
                  <span>Deploy your projects to the web</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prerequisites</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground'>{course.prerequisites}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='instructor' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>About the Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-start space-x-4'>
                <div className='flex justify-center items-center bg-muted rounded-full w-16 h-16'>
                  <span className='font-bold text-xl'>SJ</span>
                </div>
                <div className='space-y-2'>
                  <h3 className='font-bold text-xl'>{`Multiple Instructor`}</h3>
                  <p className='text-muted-foreground'>
                    Senior Web Developer & Educator
                  </p>
                  <p className='text-sm'>
                    Sarah has over 8 years of experience in web development and
                    has taught thousands of students how to code. She
                    specializes in modern JavaScript frameworks and responsive
                    design.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='reviews' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Student Reviews</CardTitle>
              <CardDescription>
                {5} out of 5 stars ({`55`} reviews)
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-4'>
                <div className='pb-4 border-b'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <div className='flex'>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className='fill-current w-4 h-4 text-yellow-400'
                        />
                      ))}
                    </div>
                    <span className='font-medium'>John D.</span>
                    <span className='text-muted-foreground text-sm'>
                      2 days ago
                    </span>
                  </div>
                  <p className='text-sm'>
                    Excellent course! The instructor explains everything clearly
                    and the projects are very practical.
                  </p>
                </div>
                <div className='pb-4 border-b'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <div className='flex'>
                      {[1, 2, 3, 4].map((star) => (
                        <Star
                          key={star}
                          className='fill-current w-4 h-4 text-yellow-400'
                        />
                      ))}
                      <Star className='w-4 h-4 text-muted-foreground' />
                    </div>
                    <span className='font-medium'>Maria S.</span>
                    <span className='text-muted-foreground text-sm'>
                      1 week ago
                    </span>
                  </div>
                  <p className='text-sm'>
                    Great content and well-structured lessons. Would recommend
                    to anyone starting in web development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
