import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AssignmentSubmissionForm } from './AssignmentSubmissionForm';

const sampleAssignment = {
  id: 'sample-1',
  title: 'Build a Todo App with Next.js',
  description: `Create a simple todo application using Next.js 13+ with the following features:
    • Add, edit, and delete todos
    • Mark todos as complete
    • Store todos in a database
    • Add basic styling using Tailwind CSS
    
    Submit your code and deployment URL below.`,
  dueDate: '2025-10-15',
};

export default function AssignmentsPage() {
  return (
    <div className='space-y-8 mx-auto py-10 container'>
      <div>
        <h1 className='font-bold text-3xl'>Assignments</h1>
        <p className='text-muted-foreground'>
          View and submit your assignments
        </p>
      </div>

      <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
        {/* Assignment Details */}
        <Card>
          <CardHeader>
            <CardTitle>{sampleAssignment.title}</CardTitle>
            <CardDescription>Due: {sampleAssignment.dueDate}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='whitespace-pre-line'>
              {sampleAssignment.description}
            </p>
          </CardContent>
        </Card>

        {/* Submission Form */}
        <AssignmentSubmissionForm
          assignmentId={sampleAssignment.id}
          assignmentTitle={sampleAssignment.title}
        />
      </div>
    </div>
  );
}
