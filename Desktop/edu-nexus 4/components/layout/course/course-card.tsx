'use client';
import { EnrolleOnCoursesAction } from '@/app/all-courses/_actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { TCourse } from '@/drizzle/schema';
import { useMutation } from '@tanstack/react-query';
import { Clock, User, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 hover:bg-green-200',
  intermediate: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  advanced: 'bg-red-100 text-red-800 hover:bg-red-200',
};

export function CourseCard({ courseData }: { courseData: TCourse }) {
  const {
    id,
    title,
    subTitle,
    description,
    thumbnailUrl,
    courseCategory,
    difficultyLevel,
    courseDuration,
    courseLanguage,
    coursePrice,
  } = courseData;

  const { mutate: enroll, isPending } = useMutation({
    mutationFn: EnrolleOnCoursesAction,
    onSuccess: ({ message }) => {
      toast.success(message);
    },
  });
  return (
    <Card className='group flex flex-col bg-card hover:shadow-lg border-border h-full overflow-hidden transition-all hover:-translate-y-1 duration-300'>
      <div className='relative overflow-hidden'>
        {/* <img
          src={
            thumbnailUrl ||
            `/placeholder.svg?height=200&width=350&query=${encodeURIComponent(
              title + ' course thumbnail'
            )}`
          }
          alt={`${title} course thumbnail`}
          className='w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300'
        /> */}
        <h2 className='mt-4 px-2 font-bold text-primary/90 text-2xl md:text-3xl text-center line-clamp-3 leading-tight'>
          {title}
        </h2>
        <div className='-top-0 right-0 absolute'>
          <Badge className={` border-0 font-medium`}>{difficultyLevel}</Badge>
        </div>
      </div>

      <CardHeader className='pb-3'>
        <div className='space-y-2'>
          <h3
            className='font-bold text-card-foreground text-lg line-clamp-2 leading-tight'
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {title}
          </h3>
          {subTitle && (
            <p
              className='text-muted-foreground text-sm line-clamp-1'
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              {subTitle}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className='flex-1 pb-4'>
        {description && (
          <p
            className='mb-4 text-muted-foreground text-sm line-clamp-3'
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            {description}
          </p>
        )}

        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-muted-foreground text-sm'>
            <User className='w-4 h-4' />
            <span style={{ fontFamily: 'var(--font-source-sans)' }}>
              {`Admin`}
            </span>
          </div>

          <div className='flex items-center gap-2 text-muted-foreground text-sm'>
            <Clock className='w-4 h-4' />
            <span style={{ fontFamily: 'var(--font-source-sans)' }}>
              {courseDuration}
            </span>
          </div>

          <div className='flex justify-between items-center'>
            <Badge variant='secondary' className='text-xs'>
              {courseCategory}
            </Badge>
            <Badge variant='outline' className='text-xs'>
              {courseLanguage}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className='pt-0'>
        <div className='space-y-3 w-full'>
          {coursePrice !== undefined && (
            <div className='flex items-center gap-2 font-semibold text-primary text-lg'>
              <DollarSign className='w-5 h-5' />
              <span style={{ fontFamily: 'var(--font-source-sans)' }}>
                {coursePrice === 0 ? 'Free' : `$${coursePrice}`}
              </span>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className='bg-primary hover:bg-primary/90 w-full font-medium text-primary-foreground'
                disabled={isPending}
              >
                Enroll Now
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Do you want to subscribe to the given course?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => enroll({ courseId: id })}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
