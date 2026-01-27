export const ROLES = ['admin', 'user', 'instructor'] as const;
export type TRoles = (typeof ROLES)[number];
