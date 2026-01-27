'use client';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddLessonAction, AddModuleAction } from '../_actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';

export default function AddLessonButton({ moduleId }: { moduleId: string }) {
  const [lessonName, setLessonName] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [lessonDurationMins, setLessonDurationMins] = useState(0);
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleModuleCreation = async () => {
    setIsLoading(true);
    const res = await AddLessonAction({
      moduleId,
      title: lessonName,
      content: lessonText,
      videoUrl: lessonVideoUrl,
      durationMinutes: lessonDurationMins,
      id: '',
    });
    setIsLoading(false);
    if (res.success) {
      toast.success('Lesson Added Successfully!');
      router.refresh();
      setModalOpen(false);
    }
  };

  return (
    <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialogTrigger asChild>
        <Button>
          <Plus /> Add a New Lesson
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New Module</AlertDialogTitle>
          <AlertDialogDescription>
            Enter module relavant information
          </AlertDialogDescription>
          <div className='flex flex-col gap-3 mx-5 my-5'>
            <Input
              type='text'
              placeholder='Lesson Name'
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
            />
            <Textarea
              placeholder='Lesson Text'
              value={lessonText}
              onChange={(e) => setLessonText(e.target.value)}
            />
            <Input
              type='number'
              value={lessonDurationMins}
              min={0}
              onChange={(e) => setLessonDurationMins(Number(e.target.value))}
            />
            <Input
              type='text'
              placeholder='Video Url'
              value={lessonVideoUrl}
              onChange={(e) => setLessonVideoUrl(e.target.value)}
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {/* <AlertDialogAction>Continue</AlertDialogAction> */}
          <Button onClick={handleModuleCreation} disabled={isLoading}>
            {isLoading && <Loader2 className='animate-spin' />}
            Add Lesson
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
