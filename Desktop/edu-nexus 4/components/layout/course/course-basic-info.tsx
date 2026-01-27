'use client';
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFormContext } from 'react-hook-form';
import { TCourseInsert } from '@/drizzle/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface CourseBasicInfoProps {
  courseImage: string;
  setCourseImage: (url: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export default function CourseBasicInfo({
  courseImage,
  setCourseImage,
  selectedTags,
  setSelectedTags,
}: CourseBasicInfoProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TCourseInsert>();
  return (
    <div>
      <div className='gap-6 grid lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          {/* Basic Course Information */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>
                Provide the basic information about your course
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='title'>Course Title *</Label>
                <Input
                  id='title'
                  placeholder='e.g., Complete Web Development Bootcamp'
                  className='text-lg'
                  onChange={(e) => onFieldChange('courseTitle', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='subtitle'>Course Subtitle</Label>
                <Input
                  id='subtitle'
                  placeholder='A brief, engaging description of your course'
                  onChange={(e) => onFieldChange('subTitle', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Course Description *</Label>
                <Textarea
                  id='description'
                  placeholder='Describe what students will learn in this course...'
                  className='min-h-32'
                  onChange={(e) => onFieldChange('description', e.target.value)}
                />
              </div>

              <div className='gap-4 grid md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='category'>Category *</Label>
                  <Select
                    value={courseData.category}
                    onValueChange={(value) => onFieldChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select category' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='web_development'>
                        Web Development
                      </SelectItem>
                      <SelectItem value='data_science'>Data Science</SelectItem>
                      <SelectItem value='mobile_development'>
                        Mobile Development
                      </SelectItem>
                      <SelectItem value='design'>Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='level'>Difficulty Level *</Label>
                  <Select
                    value={courseData.difficulty}
                    onValueChange={(value) =>
                      onFieldChange('difficulty', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select level' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='beginner'>Beginner</SelectItem>
                      <SelectItem value='intermediate'>Intermediate</SelectItem>
                      <SelectItem value='advanced'>Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='gap-4 grid md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='duration'>Estimated Duration</Label>
                  <Input id='duration' placeholder='e.g., 8 weeks, 40 hours' />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='language'>Language</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder='Select language' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='english'>English</SelectItem>
                      <SelectItem value='spanish'>Spanish</SelectItem>
                      <SelectItem value='french'>French</SelectItem>
                      <SelectItem value='german'>German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prerequisites */}
          <Card>
            <CardHeader>
              <CardTitle>Prerequisites</CardTitle>
              <CardDescription>
                What should students know before taking this course?
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Textarea
                placeholder='List any prerequisites or recommended background knowledge...'
                className='min-h-24'
              />
            </CardContent>
          </Card>
        </div>

        <div className='space-y-6'>
          {/* Course Image */}
          <Card>
            <CardHeader>
              <CardTitle>Course Image</CardTitle>
              <CardDescription>
                Upload a compelling course thumbnail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {courseImage ? (
                  <div className='relative rounded-lg aspect-video overflow-hidden'>
                    <Image
                      src={courseImage || '/placeholder.svg'}
                      alt='Course thumbnail'
                      fill
                      className='object-cover'
                    />
                    <Button
                      variant='destructive'
                      size='sm'
                      className='top-2 right-2 absolute'
                      onClick={() => setCourseImage('')}
                    >
                      <X className='w-4 h-4' />
                    </Button>
                  </div>
                ) : (
                  <div className='p-8 border-2 border-muted-foreground/25 border-dashed rounded-lg text-center'>
                    <Upload className='mx-auto w-12 h-12 text-muted-foreground/50' />
                    <div className='mt-4'>
                      <Button
                        variant='outline'
                        onClick={() =>
                          setCourseImage(
                            '/placeholder.svg?height=200&width=300'
                          )
                        }
                      >
                        Upload Image
                      </Button>
                      <p className='mt-2 text-muted-foreground text-sm'>
                        Recommended: 1280x720px
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Instructor Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center space-x-4'>
                <div className='flex justify-center items-center bg-muted rounded-full w-16 h-16'>
                  <span className='font-bold text-xl'>JD</span>
                </div>
                <div>
                  <p className='font-medium'>John Doe</p>
                  <p className='text-muted-foreground text-sm'>
                    Senior Developer
                  </p>
                </div>
              </div>
              <Textarea
                placeholder='Write a brief bio about yourself...'
                className='min-h-24'
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
