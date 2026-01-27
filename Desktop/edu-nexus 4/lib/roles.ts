export const ROLES = ['admin', 'moderator', 'content_creator', 'user'] as const;

export type TRoles = (typeof ROLES)[number];
