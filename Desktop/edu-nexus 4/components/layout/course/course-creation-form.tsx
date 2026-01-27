'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { TCourseInsertSchema } from '@/drizzle/schema';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Save, Eye, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { CreateCourseAction } from '@/app/admin/course/create/_actions';
import { toast } from 'sonner';

export default function CreateCourseForm() {
  const [previewMode, setPreviewMode] = useState(false);
  const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    subTitle: z.string().optional(),
    description: z.string().optional(),
    thumbnailUrl: z.string().url('Invalid URL').optional(),
    courseCategory: z.enum([
      'web_development',
      'cse_fundamentals',
      'mobile_development',
      'design',
      'data_science',
      'other',
    ]),
    difficultyLevel: z.enum(['beginner', 'intermediate', 'expert']),
    courseDuration: z.string().min(1, 'Duration is required'),
    courseLanguage: z.enum(['english', 'bangla']),
    prerequisites: z.string().optional(),
    coursePrice: z.number(),
    status: z.enum(['unpublished', 'published']).nullable(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      subTitle: '',
      description: '',
      thumbnailUrl: '',
      courseCategory: 'other',
      difficultyLevel: 'beginner',
      courseDuration: '',
      courseLanguage: 'english',
      prerequisites: '',
      coursePrice: 0,
      status: 'unpublished',
    },
  });

  const { mutateAsync: createCourse, isPending } = useMutation({
    mutationFn: CreateCourseAction,
    onSuccess: () => {
      toast.success('Course created successfully');
      // methods.reset(); // Reset form after successful creation
      // You might want to navigate to the courses list here
    },
    onError: (error: Error) => {
      toast.error('Failed to create course: ' + error.message);
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    try {
      const res = await createCourse({
        ...values,
        id: '',
        instructorId: '',
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className='space-y-6 py-10'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div className='flex items-center space-x-4'>
          <div>
            <h1 className='font-bold text-3xl'>Create New Course</h1>
            <p className='text-muted-foreground'>
              Build an engaging learning experience for your students
            </p>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className='mr-2 w-4 h-4' />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant='outline'

            // onClick={() => {
            //   form.setValue('status', 'unpublished');
            //   form.handleSubmit(onSubmit)();
            // }}
          >
            <Save className='mr-2 w-4 h-4' />
            Save Draft
          </Button>
          <Button
            type='button'
            disabled={isPending}
            onClick={form.handleSubmit((data) => {
              form.handleSubmit(onSubmit)();
            })}
          >
            {isPending && <Loader2 className='animate-spin' />}
            Publish Course
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
          id='course-form'
        >
          <div className='space-y-6 mx-auto max-w-3xl'>
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
                <CardDescription>
                  Provide the basic information about your course
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Title */}
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Complete Web Development Bootcamp'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subtitle */}
                <FormField
                  control={form.control}
                  name='subTitle'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Subtitle</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='A brief, engaging description of your course'
                          {...field}
                          value={String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Describe what students will learn in this course...'
                          className='min-h-32'
                          {...field}
                          value={String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category & Level */}
                <div className='gap-4 grid md:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='courseCategory'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select category' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COURSE_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='difficultyLevel'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select level' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COURSE_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duration & Language */}
                <div className='gap-4 grid md:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='courseDuration'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Duration *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g., 8 weeks, 40 hours'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='courseLanguage'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select language' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='english'>English</SelectItem>
                            <SelectItem value='bangla'>Bangla</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Prerequisites */}
                <FormField
                  control={form.control}
                  name='prerequisites'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prerequisites</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='List any prerequisites for this course'
                          {...field}
                          value={String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Thumbnail */}
                <FormField
                  control={form.control}
                  name='thumbnailUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Enter image URL'
                          {...field}
                          value={String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Course Price */}
                <FormField
                  control={form.control}
                  name='coursePrice'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          placeholder='Enter price'
                          {...field}
                          value={String(field.value)}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Enter 0 for free courses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
