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

interface CoursePricingProps {
  courseData: TCourseInsert;
  onFieldChange: (field: keyof TCourseInsert, value: any) => void;
}

export default function CoursePricing({
  courseData,
  onFieldChange,
}: CoursePricingProps) {
  return (
    <div className='mx-auto max-w-2xl'>
      <Card>
        <CardHeader>
          <CardTitle>Course Pricing</CardTitle>
          <CardDescription>Set the price for your course</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-4'>
            <div className='flex items-center space-x-4'>
              <input
                type='radio'
                id='free'
                name='pricing'
                className='w-4 h-4'
              />
              <Label htmlFor='free' className='flex-1'>
                <div>
                  <p className='font-medium'>Free Course</p>
                  <p className='text-muted-foreground text-sm'>
                    Make your course available for free
                  </p>
                </div>
              </Label>
            </div>

            <div className='flex items-center space-x-4'>
              <input
                type='radio'
                id='paid'
                name='pricing'
                className='w-4 h-4'
                defaultChecked
              />
              <Label htmlFor='paid' className='flex-1'>
                <div>
                  <p className='font-medium'>Paid Course</p>
                  <p className='text-muted-foreground text-sm'>
                    Set a price for your course
                  </p>
                </div>
              </Label>
            </div>
          </div>

          <div className='space-y-4 ml-8'>
            <div className='gap-4 grid md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='price'>Course Price ($)</Label>
                <Input
                  id='price'
                  type='number'
                  placeholder='99.00'
                  onChange={(e) =>
                    onFieldChange(
                      'coursePrice',
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='currency'>Currency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder='USD' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='usd'>USD</SelectItem>
                    <SelectItem value='eur'>BDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='flex justify-between items-center'>
              <div className='space-y-0.5'>
                <Label>Discount Available</Label>
                <p className='text-muted-foreground text-sm'>
                  Offer promotional pricing
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
