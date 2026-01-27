import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Mail, MapPin, Award, BookOpen, Edit } from 'lucide-react';

export default function ProfilePage() {
  const achievements = [
    {
      id: 1,
      title: 'First Course Completed',
      description: 'Completed your first course',
      earned: true,
    },
    {
      id: 2,
      title: 'Quick Learner',
      description: 'Completed 3 courses in a month',
      earned: true,
    },
    {
      id: 3,
      title: 'Discussion Starter',
      description: 'Started 10 discussions',
      earned: false,
    },
    {
      id: 4,
      title: 'Perfect Score',
      description: 'Got 100% on an assignment',
      earned: true,
    },
    {
      id: 5,
      title: 'Consistent Learner',
      description: 'Studied for 30 days straight',
      earned: false,
    },
    {
      id: 6,
      title: 'Mentor',
      description: 'Helped 50 fellow students',
      earned: false,
    },
  ];

  const learningStats = [
    { label: 'Courses Completed', value: 12, total: 18 },
    { label: 'Study Hours', value: 147, total: 200 },
    { label: 'Assignments Submitted', value: 28, total: 35 },
    { label: 'Discussion Posts', value: 8, total: 15 },
  ];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='font-bold text-3xl'>Profile</h1>
        <p className='text-muted-foreground'>
          Manage your account and track your learning progress
        </p>
      </div>

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
          <TabsTrigger value='achievements'>Achievements</TabsTrigger>
          <TabsTrigger value='activity'>Activity</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          {/* Profile Header */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center space-x-6'>
                <Avatar className='w-24 h-24'>
                  <AvatarImage
                    src='/placeholder.svg?height=96&width=96'
                    alt='Profile'
                  />
                  <AvatarFallback className='text-2xl'>JD</AvatarFallback>
                </Avatar>
                <div className='space-y-2'>
                  <h2 className='font-bold text-2xl'>John Doe</h2>
                  <p className='text-muted-foreground'>
                    Full Stack Developer Student
                  </p>
                  <div className='flex items-center space-x-4 text-muted-foreground text-sm'>
                    <div className='flex items-center space-x-1'>
                      <Mail className='w-4 h-4' />
                      <span>john.doe@example.com</span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <MapPin className='w-4 h-4' />
                      <span>San Francisco, CA</span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <Calendar className='w-4 h-4' />
                      <span>Joined March 2024</span>
                    </div>
                  </div>
                  <div className='flex space-x-2'>
                    <Badge>Web Development</Badge>
                    <Badge variant='secondary'>Data Science</Badge>
                    <Badge variant='outline'>Marketing</Badge>
                  </div>
                </div>
                <div className='ml-auto'>
                  <Button variant='outline'>
                    <Edit className='mr-2 w-4 h-4' />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <div className='gap-6 grid md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>
                  Your overall learning statistics
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {learningStats.map((stat, index) => (
                  <div key={index} className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span>{stat.label}</span>
                      <span>
                        {stat.value}/{stat.total}
                      </span>
                    </div>
                    <Progress
                      value={(stat.value / stat.total) * 100}
                      className='h-2'
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest accomplishments</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {achievements
                  .filter((a) => a.earned)
                  .slice(0, 3)
                  .map((achievement) => (
                    <div
                      key={achievement.id}
                      className='flex items-center space-x-3'
                    >
                      <div className='flex justify-center items-center bg-yellow-100 rounded-full w-10 h-10'>
                        <Award className='w-5 h-5 text-yellow-600' />
                      </div>
                      <div>
                        <p className='font-medium'>{achievement.title}</p>
                        <p className='text-muted-foreground text-sm'>
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  ))}
                <Button
                  variant='outline'
                  size='sm'
                  className='bg-transparent w-full'
                >
                  View All Achievements
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Current Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Current Courses</CardTitle>
              <CardDescription>
                Courses you're currently enrolled in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='gap-4 grid md:grid-cols-2'>
                <div className='flex items-center space-x-4 p-4 border rounded-lg'>
                  <BookOpen className='w-8 h-8 text-primary' />
                  <div className='flex-1'>
                    <h4 className='font-medium'>
                      Introduction to Web Development
                    </h4>
                    <p className='text-muted-foreground text-sm'>
                      75% complete
                    </p>
                    <Progress value={75} className='mt-2 h-2' />
                  </div>
                </div>
                <div className='flex items-center space-x-4 p-4 border rounded-lg'>
                  <BookOpen className='w-8 h-8 text-primary' />
                  <div className='flex-1'>
                    <h4 className='font-medium'>Data Science Fundamentals</h4>
                    <p className='text-muted-foreground text-sm'>
                      45% complete
                    </p>
                    <Progress value={45} className='mt-2 h-2' />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='settings' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='gap-4 grid md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='firstName'>First Name</Label>
                  <Input id='firstName' defaultValue='John' />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='lastName'>Last Name</Label>
                  <Input id='lastName' defaultValue='Doe' />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  defaultValue='john.doe@example.com'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bio'>Bio</Label>
                <Textarea
                  id='bio'
                  placeholder='Tell us about yourself...'
                  defaultValue='Passionate about learning new technologies and building amazing web applications.'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='location'>Location</Label>
                <Input id='location' defaultValue='San Francisco, CA' />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your learning experience
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='font-medium'>Email Notifications</p>
                  <p className='text-muted-foreground text-sm'>
                    Receive updates about your courses
                  </p>
                </div>
                <Button variant='outline' size='sm'>
                  Configure
                </Button>
              </div>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='font-medium'>Study Reminders</p>
                  <p className='text-muted-foreground text-sm'>
                    Get reminded to study regularly
                  </p>
                </div>
                <Button variant='outline' size='sm'>
                  Configure
                </Button>
              </div>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='font-medium'>Privacy Settings</p>
                  <p className='text-muted-foreground text-sm'>
                    Control who can see your profile
                  </p>
                </div>
                <Button variant='outline' size='sm'>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='achievements' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>
                Track your learning milestones and accomplishments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='gap-4 grid md:grid-cols-2 lg:grid-cols-3'>
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 border rounded-lg ${
                      achievement.earned
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className='flex items-center space-x-3'>
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full ${
                          achievement.earned ? 'bg-yellow-100' : 'bg-muted'
                        }`}
                      >
                        <Award
                          className={`h-6 w-6 ${
                            achievement.earned
                              ? 'text-yellow-600'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className='font-medium'>{achievement.title}</h4>
                        <p className='text-muted-foreground text-sm'>
                          {achievement.description}
                        </p>
                        {achievement.earned && (
                          <Badge variant='secondary' className='mt-1'>
                            Earned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='activity' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your learning activity over the past few weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex items-center space-x-4'>
                  <div className='bg-green-500 rounded-full w-2 h-2'></div>
                  <div className='flex-1'>
                    <p className='font-medium'>
                      Completed "React Hooks" lesson
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      Introduction to Web Development • 2 hours ago
                    </p>
                  </div>
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='bg-blue-500 rounded-full w-2 h-2'></div>
                  <div className='flex-1'>
                    <p className='font-medium'>
                      Submitted "CSS Grid Assignment"
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      Introduction to Web Development • 1 day ago
                    </p>
                  </div>
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='bg-purple-500 rounded-full w-2 h-2'></div>
                  <div className='flex-1'>
                    <p className='font-medium'>
                      Joined "Web Development Discussion"
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      General Discussion • 2 days ago
                    </p>
                  </div>
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='bg-orange-500 rounded-full w-2 h-2'></div>
                  <div className='flex-1'>
                    <p className='font-medium'>
                      Earned "JavaScript Basics" certificate
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      Achievement unlocked • 3 days ago
                    </p>
                  </div>
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='bg-red-500 rounded-full w-2 h-2'></div>
                  <div className='flex-1'>
                    <p className='font-medium'>
                      Started "Data Science Fundamentals"
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      New course enrollment • 1 week ago
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
