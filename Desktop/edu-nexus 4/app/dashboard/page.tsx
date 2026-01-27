import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  PlayCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className=''>
      <div>
        <h1 className='font-bold text-3xl'>Welcome back, John!</h1>
        <p className='text-muted-foreground'>
          Here's what's happening with your learning journey.
        </p>
      </div>

      {/* Stats Cards */}
      <div className='gap-4 grid md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row justify-between items-center space-y-0 pb-2'>
            <CardTitle className='font-medium text-sm'>
              Enrolled Courses
            </CardTitle>
            <BookOpen className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='font-bold text-2xl'>6</div>
            <p className='text-muted-foreground text-xs'>+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row justify-between items-center space-y-0 pb-2'>
            <CardTitle className='font-medium text-sm'>
              Completed Courses
            </CardTitle>
            <Award className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='font-bold text-2xl'>12</div>
            <p className='text-muted-foreground text-xs'>+3 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row justify-between items-center space-y-0 pb-2'>
            <CardTitle className='font-medium text-sm'>Study Hours</CardTitle>
            <Clock className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='font-bold text-2xl'>47</div>
            <p className='text-muted-foreground text-xs'>This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row justify-between items-center space-y-0 pb-2'>
            <CardTitle className='font-medium text-sm'>Average Grade</CardTitle>
            <TrendingUp className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='font-bold text-2xl'>87%</div>
            <p className='text-muted-foreground text-xs'>+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className='gap-6 grid md:grid-cols-2'>
        {/* Current Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
            <CardDescription>Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <h4 className='font-medium'>Introduction to Web Development</h4>
                <Badge variant='secondary'>In Progress</Badge>
              </div>
              <Progress value={75} className='h-2' />
              <div className='flex justify-between items-center text-muted-foreground text-sm'>
                <span>Lesson 18 of 24</span>
                <span>75% complete</span>
              </div>
              <Button asChild size='sm' className='w-full'>
                <Link href='/courses/1/lessons/18'>
                  <PlayCircle className='mr-2 w-4 h-4' />
                  Continue Learning
                </Link>
              </Button>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <h4 className='font-medium'>Data Science Fundamentals</h4>
                <Badge variant='secondary'>In Progress</Badge>
              </div>
              <Progress value={45} className='h-2' />
              <div className='flex justify-between items-center text-muted-foreground text-sm'>
                <span>Lesson 8 of 18</span>
                <span>45% complete</span>
              </div>
              <Button
                asChild
                size='sm'
                variant='outline'
                className='bg-transparent w-full'
              >
                <Link href='/courses/2/lessons/8'>
                  <PlayCircle className='mr-2 w-4 h-4' />
                  Continue Learning
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Assignments</CardTitle>
            <CardDescription>Don't miss these deadlines</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center space-x-4'>
              <div className='flex justify-center items-center bg-red-100 rounded-full w-10 h-10'>
                <Calendar className='w-5 h-5 text-red-600' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='font-medium'>JavaScript Project</p>
                <p className='text-muted-foreground text-sm'>Due in 2 days</p>
              </div>
              <Badge variant='destructive'>Urgent</Badge>
            </div>

            <div className='flex items-center space-x-4'>
              <div className='flex justify-center items-center bg-yellow-100 rounded-full w-10 h-10'>
                <Calendar className='w-5 h-5 text-yellow-600' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='font-medium'>Data Analysis Quiz</p>
                <p className='text-muted-foreground text-sm'>Due in 5 days</p>
              </div>
              <Badge variant='secondary'>Pending</Badge>
            </div>

            <div className='flex items-center space-x-4'>
              <div className='flex justify-center items-center bg-blue-100 rounded-full w-10 h-10'>
                <Calendar className='w-5 h-5 text-blue-600' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='font-medium'>Marketing Campaign</p>
                <p className='text-muted-foreground text-sm'>Due in 1 week</p>
              </div>
              <Badge variant='outline'>Assigned</Badge>
            </div>

            <Button asChild variant='outline' className='bg-transparent w-full'>
              <Link href='/assignments'>View All Assignments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center space-x-4'>
              <div className='bg-green-500 rounded-full w-2 h-2'></div>
              <div className='flex-1'>
                <p className='font-medium'>Completed "React Hooks" lesson</p>
                <p className='text-muted-foreground text-sm'>2 hours ago</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='bg-blue-500 rounded-full w-2 h-2'></div>
              <div className='flex-1'>
                <p className='font-medium'>Submitted "CSS Grid Assignment"</p>
                <p className='text-muted-foreground text-sm'>1 day ago</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='bg-purple-500 rounded-full w-2 h-2'></div>
              <div className='flex-1'>
                <p className='font-medium'>
                  Joined "Web Development Discussion"
                </p>
                <p className='text-muted-foreground text-sm'>2 days ago</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='bg-orange-500 rounded-full w-2 h-2'></div>
              <div className='flex-1'>
                <p className='font-medium'>
                  Earned "JavaScript Basics" certificate
                </p>
                <p className='text-muted-foreground text-sm'>3 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
