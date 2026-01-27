'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  MessageSquare,
  User,
  Shield,
  BookMarked,
  Plus,
  Bolt,
  Users,
  Sparkles,
} from 'lucide-react';
import { TRoles } from '@/auth/roles';
import { Separator } from '@/components/ui/separator';
import { ROUTES } from '@/lib/constants';

export const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Courses',
    href: '/dashboard/courses',
    icon: BookOpen,
  },
  {
    name: 'My Course',
    href: '/dashboard/my-courses',
    icon: BookOpen,
  },
  {
    name: 'Assignments',
    href: ROUTES.assignments,
    icon: ClipboardList,
  },
  {
    name: 'Grades',
    href: '/grades',
    icon: BarChart3,
  },
  {
    name: 'Discussions',
    href: '/discussions',
    icon: MessageSquare,
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    name: 'Ask AI',
    href: '/dashboard/ask-ai',
    icon: Sparkles,
  },
];

const adminSection = [
  { name: 'Admin', href: ROUTES.admin, icon: Shield },
  { name: 'Course List', href: ROUTES.adminCourse, icon: BookMarked },
  { name: 'Create Course', href: ROUTES.createCourse, icon: Plus },
  { name: 'Members', href: ROUTES.members, icon: Users },
  { name: 'Settings', href: '/', icon: Bolt },
];

export function SideNav({ userRole }: { userRole: TRoles | (string & {}) }) {
  const pathname = usePathname();

  const navItemClassName =
    'flex items-center space-x-3 hover:bg-accent px-3 py-2 rounded-lg font-medium text-sm hover:text-accent-foreground';

  return (
    <nav className='flex flex-col space-y-1'>
      {(userRole === 'user' ? [] : adminSection).map((item) => {
        {
          /* {adminSection.map((item) => { */
        }
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              navItemClassName,
              pathname === item.href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            )}
          >
            <Icon className='w-4 h-4' />
            <span>{item.name}</span>
          </Link>
        );
      })}
      <Separator />
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              navItemClassName,
              pathname === item.href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            )}
          >
            <Icon className='w-4 h-4' />
            <span>{item.name}</span>
          </Link>
        );
      })}
      {/* <Separator className='my-4' /> */}
    </nav>
  );
}
