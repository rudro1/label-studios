'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoPlayer from './VideoPlayer';

interface CourseVideoPlayerProps {
  title: string;
  thumbnailUrl?: string;
}

export default function CourseVideoPlayer({
  title,
  thumbnailUrl,
}: CourseVideoPlayerProps) {
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleStartLesson = (e: CustomEvent<{ videoUrl: string | null }>) => {
      setActiveVideoUrl(e.detail.videoUrl);
    };

    window.addEventListener('startLesson', handleStartLesson as EventListener);
    return () => {
      window.removeEventListener(
        'startLesson',
        handleStartLesson as EventListener
      );
    };
  }, []);

  return (
    <div className='relative rounded-lg aspect-video overflow-hidden'>
      {activeVideoUrl ? (
        <VideoPlayer videoUrl={activeVideoUrl} />
      ) : (
        <>
          <Image
            src={thumbnailUrl || '/placeholder.svg'}
            alt={title}
            fill
            className='object-cover'
          />
          <div className='absolute inset-0 flex justify-center items-center bg-black/20'>
            <PlayCircle className='w-12 h-12 text-white' />
          </div>
        </>
      )}
    </div>
  );
}

interface LessonStartButtonProps {
  videoUrl?: string | null;
}

export function LessonStartButton({ videoUrl }: LessonStartButtonProps) {
  const handleStartLesson = () => {
    const event = new CustomEvent('startLesson', {
      detail: { videoUrl },
    });
    window.dispatchEvent(event);
  };

  return (
    <Button variant='outline' onClick={handleStartLesson} disabled={!videoUrl}>
      Start
    </Button>
  );
}
