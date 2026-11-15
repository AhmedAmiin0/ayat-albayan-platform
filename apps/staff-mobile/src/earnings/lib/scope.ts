/** Whose earnings: an admin names the teacher, a teacher reads their own (the API takes the id from the session). */
export interface EarningsScope {
  teacherId?: string;
}

export const earningsBase = (scope: EarningsScope): string =>
  scope.teacherId ? `/teacher-earnings/${scope.teacherId}` : '/teachers/me/earnings';
