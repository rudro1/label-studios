'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import useListUsersAdmin from '@/hooks/useListUsersAdmin';
import { Loader2 } from 'lucide-react';
export default function UserList() {
  const { data, isLoading, refetch } = useListUsersAdmin({ limit: 10 });
  return (
    <div>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[200px]'>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className='text-right'>Update At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data?.users.map((item, index) => (
            <TableRow key={index}>
              <TableCell className='font-medium'>{item.name}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.role}</TableCell>
              <TableCell className='text-right'>
                {new Date(item.updatedAt).toLocaleString('en-Us')}
              </TableCell>
              {/* <TableCell className='text-right'>$250.00</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
