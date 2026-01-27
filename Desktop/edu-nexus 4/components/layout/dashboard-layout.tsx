import type React from 'react';
import Link from 'next/link';
import { BookOpen, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NavBar from './Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SideNav } from './dashboard/side-nav';
import { MobileNav } from './dashboard/mobile-side-nav';
import { auth } from '@/auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import LogoutButton from './LogoutButton';

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function DashboardLayout({ children }: AppLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // if(session?.user.role === '')
  if (!session) redirect('/');
  return (
    <div className='flex bg-background h-screen overflow-hidden'>
      {/* Sidebar */}
      <div className='hidden md:flex md:flex-col md:w-64'>
        <div className='flex flex-col flex-grow bg-background pt-5 border-r overflow-y-auto'>
          <div className='flex flex-shrink-0 items-center px-4'>
            <Link className='flex items-center' href='/'>
              <BookOpen className='mr-2 w-8 h-8' />
              <span className='font-bold text-xl'>Edu Nexus</span>
            </Link>
          </div>
          <div className='flex flex-col flex-grow mt-8 px-4'>
            {/* <NavBar /> */}
            <SideNav userRole={session?.user?.role ?? 'user'} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='flex flex-col flex-1 overflow-hidden'>
        {/* Top navigation */}
        <header className='flex justify-between items-center bg-background px-6 py-4 border-b'>
          <div className='flex items-center space-x-4'>
            <MobileNav />
            <div className='relative flex flex-row gap-3'>
              <Search className='top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 transform' />
              <Input
                placeholder='Search courses, assignments...'
                className='pl-10 w-64'
              />
            </div>
          </div>
          <div className='flex items-center space-x-4'>
            <Button variant='ghost' size='icon'>
              <Bell className='w-5 h-5' />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='relative rounded-full w-8 h-8'
                >
                  <Avatar className='w-8 h-8'>
                    <AvatarImage
                      src='/placeholder.svg?height=32&width=32'
                      alt='User'
                    />
                    <AvatarFallback>{session?.user.name[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56' align='end' forceMount>
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='font-medium text-sm leading-none'>
                      {session?.user.name}
                    </p>
                    <p className='text-muted-foreground text-xs leading-none'>
                      {session?.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/profile'>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/settings'>Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogoutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className='flex-1 px-6 overflow-y-auto'>{children}</main>
      </div>
    </div>
  );
}
