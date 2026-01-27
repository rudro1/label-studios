import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';
import { ac, admin, instructor, user } from '@/auth/permissions';

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      defaultRole: 'user',
      adminRoles: ['admin'],
      roles: { admin, instructor, user },
    }),
  ],
});
