'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaGoogle } from 'react-icons/fa';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/auth/auth-client';
import { toast } from 'sonner';
import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const router = useRouter();

  const {
    data: signInResponse,
    isPending,
    error,
    mutateAsync: signIn,
  } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn.email({ email, password }),
    onSuccess: async ({ data, error }) => {
      if (error)
        toast.error('An Error Occured!', {
          description: error?.message,
        });
      else if (data) {
        toast.success(`Welcome ${data.user.name}!`, {
          description: 'Redirecting to dashboard',
        });
        const session = await authClient.getSession();
        if (session.data?.user.role === 'admin') router.push(ROUTES.admin);
        else router.push(ROUTES.dashboard);
      }
    },
  });
  const formOnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn({ email: emailRef.current, password: passwordRef.current });
    // const user = signInResponse?.data?.user;
    // if (user) {
    //   toast.success(`Welcome ${user.name}!`, {
    //     description: 'Redirecting to dashboard',
    //   });
    //   router.push(ROUTES.dashboard);
    // }
  };
  return (
    <form
      onSubmit={formOnSubmit}
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <div className='flex flex-col items-center gap-2 text-center'>
        <h1 className='font-bold text-2xl'>Login to your account</h1>
        <p className='text-muted-foreground text-sm text-balance'>
          Enter your email below to login to your account
        </p>
      </div>
      <div className='gap-6 grid'>
        <div className='gap-3 grid'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            onChange={(e) => (emailRef.current = e.target.value)}
            placeholder='m@example.com'
            required
          />
        </div>
        <div className='gap-3 grid'>
          <div className='flex items-center'>
            <Label htmlFor='password'>Password</Label>
            <a
              href='#'
              className='ml-auto text-sm hover:underline underline-offset-4'
            >
              Forgot your password?
            </a>
          </div>
          <Input
            id='password'
            type='password'
            minLength={6}
            onChange={(e) => (passwordRef.current = e.target.value)}
            placeholder='******'
            required
          />
        </div>
        <Button disabled={isPending} type='submit' className='w-full'>
          {isPending && <Loader2 className='animate-spin' />}
          Login
        </Button>
        <div className='after:top-1/2 after:z-0 after:absolute relative after:inset-0 after:flex after:items-center after:border-t after:border-border text-sm text-center'>
          <span className='z-10 relative bg-background px-2 text-muted-foreground'>
            Or continue with
          </span>
        </div>
        <Button variant='outline' className='w-full'>
          <FaGoogle />
          Login with Google
        </Button>
      </div>
      <div className='text-sm text-center'>
        Don&apos;t have an account?{' '}
        <Link href={ROUTES.signUp} className='underline underline-offset-4'>
          Sign up
        </Link>
      </div>
    </form>
  );
}
