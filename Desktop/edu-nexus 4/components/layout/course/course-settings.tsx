import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TCourseInsert } from '@/drizzle/schema';

interface CourseSettingsProps {
  courseData: TCourseInsert;
  onFieldChange: (field: keyof TCourseInsert, value: any) => void;
}

export default function CourseSettings({
  courseData,
  onFieldChange,
}: CourseSettingsProps) {
  return (
    <div className='mx-auto max-w-2xl'>
      <Card>
        <CardHeader>
          <CardTitle>Course Settings</CardTitle>
          <CardDescription>Configure how your course behaves</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* <div className='flex justify-between items-center'>
            <div className='space-y-0.5'>
              <Label>Course Visibility</Label>
              <p className='text-muted-foreground text-sm'>
                Make your course visible to students
              </p>
            </div>
            <Switch
              defaultChecked={courseData.visibility}
              onCheckedChange={(checked) =>
                onFieldChange('visibility', checked)
              }
            />
          </div> */}

          <div className='flex justify-between items-center'>
            <div className='space-y-0.5'>
              <Label>Allow Discussions</Label>
              <p className='text-muted-foreground text-sm'>
                Enable student discussions for this course
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className='flex justify-between items-center'>
            <div className='space-y-0.5'>
              <Label>Certificate of Completion</Label>
              <p className='text-muted-foreground text-sm'>
                Award certificates when students complete the course
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className='flex justify-between items-center'>
            <div className='space-y-0.5'>
              <Label>Drip Content</Label>
              <p className='text-muted-foreground text-sm'>
                Release lessons gradually over time
              </p>
            </div>
            <Switch />
          </div>

          {/* <div className='space-y-2'>
            <Label>Enrollment Limit</Label>
            <Input
              type='number'
              placeholder='Leave empty for unlimited'
              onChange={(e) =>
                onFieldChange('enrollmentLimit', parseInt(e.target.value) || 0)
              }
            />
          </div> */}

          <div className='space-y-2'>
            <Label>Course Duration Access</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder='Select access duration' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='lifetime'>Lifetime Access</SelectItem>
                <SelectItem value='1-year'>1 Year</SelectItem>
                <SelectItem value='6-months'>6 Months</SelectItem>
                <SelectItem value='3-months'>3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
