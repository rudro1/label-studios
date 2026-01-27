'use client';

import Link from 'next/link';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ROUTES } from '@/lib/constants';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/auth/auth-client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import { PhoneInput } from '@/components/ui/phone-input'

// import { registerFormSchema } from '@/lib/validation-schemas'

const formSchema = z.object({
  name: z.string().min(6),
  email: z.email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
});

export default function SignUpForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      //   phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const {
    data: signUpResponse,
    isPending,
    error,
    mutateAsync: signUp,
  } = useMutation({
    mutationFn: async ({
      email,
      name,
      password,
    }: {
      email: string;
      name: string;
      password: string;
    }) =>
      authClient.signUp.email({
        email,
        name,
        password,
        // callbackURL: '/',
      }),
    onSuccess: ({ data, error }) => {
      if (error)
        toast.error('An Error Occured!', {
          description: error?.message,
        });
      else if (data) {
        toast.success(`Registration Succesful!`, {
          description: 'Redirecting to dashboard',
        });
        router.push(ROUTES.dashboard);
      }
    },
  });

  async function onSubmit({
    name,
    email,
    password,
    confirmPassword,
  }: z.infer<typeof formSchema>) {
    if (password !== confirmPassword) {
      form.setError(
        'confirmPassword',
        {
          type: 'manual',
          message: "Passwords don't match!",
        },
        { shouldFocus: true }
      );
      return;
    }
    await signUp({
      name,
      email,
      password,
    });
  }

  return (
    <div className='flex justify-center items-center px-4 w-full h-full min-h-[60vh]'>
      <div className='shadow-none mx-auto'>
        <h1 className='my-4 font-bold text-3xl text-center'>Sign Up</h1>
        <h4 className='text-muted-foreground text-sm'>
          Create a new account by filling out the form below.
        </h4>
        <br />
        <div className=''>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
              <div className='gap-4 grid'>
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem className='gap-2 grid'>
                      <FormLabel htmlFor='name'>Full Name</FormLabel>
                      <FormControl>
                        <Input id='name' placeholder='John Doe' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem className='gap-2 grid'>
                      <FormLabel htmlFor='email'>Email</FormLabel>
                      <FormControl>
                        <Input
                          id='email'
                          placeholder='johndoe@mail.com'
                          type='email'
                          autoComplete='email'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem className='gap-2 grid'>
                      <FormLabel htmlFor='password'>Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          id='password'
                          placeholder='******'
                          autoComplete='new-password'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password Field */}
                <FormField
                  control={form.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem className='gap-2 grid'>
                      <FormLabel htmlFor='confirmPassword'>
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id='confirmPassword'
                          placeholder='******'
                          autoComplete='new-password'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button disabled={isPending} type='submit' className='w-full'>
                  {isPending && <Loader2 className='animate-spin' />}
                  Sign Up
                </Button>
              </div>
            </form>
          </Form>
          <div className='mt-4 text-sm text-center'>
            Already have an account?{' '}
            <Link href={ROUTES.signIn} className='underline'>
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
