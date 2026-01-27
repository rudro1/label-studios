'use client';
import React from 'react';
import { Button } from '../ui/button';
import { authClient } from '@/auth/auth-client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await authClient.signOut();
        router.push('/');
      }}
    >
      Log Out
    </Button>
  );
}
