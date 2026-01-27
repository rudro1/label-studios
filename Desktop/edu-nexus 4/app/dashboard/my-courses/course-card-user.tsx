import { TCourse } from '@/drizzle/schema';
import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, LinkIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CourseCardUser({
  courseInfo,
}: {
  courseInfo: TCourse;
}) {
  return (
    <div>
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
            {courseInfo.title}
          </h2>
          <div className='-top-0 right-0 absolute'>
            <Badge className={` border-0 font-medium`}>
              {courseInfo.difficultyLevel}
            </Badge>
          </div>
        </div>

        <CardHeader className='pb-3'>
          <div className='space-y-2'>
            <h3
              className='font-bold text-card-foreground text-lg line-clamp-2 leading-tight'
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {courseInfo.title}
            </h3>
            {courseInfo.subTitle && (
              <p
                className='text-muted-foreground text-sm line-clamp-1'
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                {courseInfo.subTitle}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className='flex-1 pb-4'>
          <p
            className='mb-4 text-muted-foreground text-sm line-clamp-3'
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            {courseInfo.description}
          </p>

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
                {courseInfo.courseDuration}
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <Badge variant='secondary' className='text-xs'>
                {courseInfo.courseCategory}
              </Badge>
              <Badge variant='outline' className='text-xs'>
                {courseInfo.courseLanguage}
              </Badge>
            </div>
          </div>
        </CardContent>

        <CardFooter className='pt-0'>
          <div className='space-y-3 w-full'>
            <div className='flex items-center gap-2 font-semibold text-primary text-lg'>
              <DollarSign className='w-5 h-5' />
              <span style={{ fontFamily: 'var(--font-source-sans)' }}>
                {courseInfo.coursePrice === 0
                  ? 'Free'
                  : `$${courseInfo.coursePrice}`}
              </span>
            </div>

            <Button
              className='bg-primary hover:bg-primary/90 w-full font-medium text-primary-foreground'
              asChild
            >
              <Link href={`/dashboard/my-courses/${courseInfo.id}`}>View</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
