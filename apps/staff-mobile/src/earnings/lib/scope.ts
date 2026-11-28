import { routePath } from '@ab/core';
import { myEarningRoutes as mine, teacherEarningRoutes as admin } from '@ab/shared';

/** Whose earnings: an admin names the teacher, a teacher reads their own (the API takes the id from the session). */
export interface EarningsScope {
  teacherId?: string;
}

type Read = 'balance' | 'sessions' | 'payments';

/** The path of one earnings read, also its query key's segments. */
export const earningsPath = (scope: EarningsScope, read: Read): string =>
  scope.teacherId ? routePath(admin[read], { teacherId: scope.teacherId }) : routePath(mine[read]);
