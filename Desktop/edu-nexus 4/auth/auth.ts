import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/drizzle/db';
import { admin as adminPlugin } from 'better-auth/plugins';
import { admin, ac, instructor, user } from './permissions';
import * as drizzleSchema from '@/drizzle/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: drizzleSchema.userTable,
      account: drizzleSchema.accountsTable,
      session: drizzleSchema.sessionsTable,
      verification: drizzleSchema.verificationTable,
    },
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  plugins: [
    adminPlugin({
      ac,
      defaultRole: 'user',
      adminRoles: ['admin'],
      roles: { admin, instructor, user },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
});
