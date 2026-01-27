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
import { AddModuleAction } from '../_actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AddModuleButton({ courseId }: { courseId: string }) {
  const [moduleName, setModuleName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleModuleCreation = async () => {
    setIsLoading(true);
    const res = await AddModuleAction({
      courseId,
      title: moduleName,
      id: '',
    });
    setIsLoading(false);
    if (res.success) {
      toast.success('Module Added Successfully!');
      router.refresh();
      setModalOpen(false);
    }
  };

  return (
    <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialogTrigger asChild>
        <Button>
          <Plus /> Add a New Module
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New Module</AlertDialogTitle>
          <AlertDialogDescription>
            Enter module relavant information
          </AlertDialogDescription>
          <div className='mx-5 my-5'>
            <Input
              type='text'
              placeholder='Module Name'
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {/* <AlertDialogAction>Continue</AlertDialogAction> */}
          <Button onClick={handleModuleCreation} disabled={isLoading}>
            {isLoading && <Loader2 className='animate-spin' />}
            Add Module
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
