'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createAssignmentSubmission } from './_actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  content: z.string().min(1, 'Submission content is required'),
  submissionUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
});

type Props = {
  assignmentId: string;
  assignmentTitle: string;
};

export function AssignmentSubmissionForm({
  assignmentId,
  assignmentTitle,
}: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
      submissionUrl: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const result = await createAssignmentSubmission({
        assignmentId,
        content: values.content,
        submissionUrl: values.submissionUrl || undefined,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Assignment submitted successfully!');
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit assignment');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Assignment</CardTitle>
        <CardDescription>
          Submit your work for &quot;{assignmentTitle}&quot;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Write your submission content here...'
                      className='min-h-32'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Explain your solution or write your assignment response
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='submissionUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='https://github.com/your-repo'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to your work (e.g., GitHub repository, Google Doc,
                    etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type='submit'
              className='w-full'
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className='mr-2 w-4 h-4 animate-spin' />
                  Submitting...
                </>
              ) : (
                'Submit Assignment'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
