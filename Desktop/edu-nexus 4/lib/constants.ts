export const SITE_NAME = 'Edu Nexus';

export const ROUTES = {
  signIn: '/sign-in',
  signUp: '/sign-up',
  dashboard: '/dashboard',
  admin: '/admin',
  members: '/admin/members',
  prfofile: '/dashboard/profile',
  myCourses: '/dashboard/courses',
  adminCourse: '/admin/course',
  createCourse: '/admin/course/create',
  assignments: '/dashboard/assignments',
};

export const COURSE_CATEGORIES = [
  'web_development',
  'cse_fundamentals',
  'mobile_development',
  'design',
  'data_science',
  'other',
] as const;

export const COURSE_LEVELS = ['beginner', 'intermediate', 'expert'] as const;

export const QUERY_KEYS = {
  listUsersAdmin: 'LIST_USERS_ADMIN',
};
