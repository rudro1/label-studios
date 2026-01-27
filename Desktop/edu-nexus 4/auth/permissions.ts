import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

const statements = {
  ...defaultStatements,
  course: ['create', 'view', 'update', 'delete'],
} as const;

const ac = createAccessControl(statements);

const admin = ac.newRole({
  course: [...statements.course],
  ...adminAc.statements,
});

const instructor = ac.newRole({
  course: [...statements.course],
});

const user = ac.newRole({
  course: ['view'],
});

export { ac, admin, instructor, user };
