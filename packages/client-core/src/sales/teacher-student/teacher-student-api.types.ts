import type { RouteResult } from '@ab/core';
import type { teacherStudentFileRoutes } from '@ab/shared';

type Answer<K extends keyof typeof teacherStudentFileRoutes> = Promise<
  RouteResult<(typeof teacherStudentFileRoutes)[K]>
>;

/** `month` YYYY-MM; undefined: the current month in her zone. */
export interface TeacherStudentMonth {
  studentId: string;
  month: string | undefined;
}

export interface TeacherStudentFileCalls {
  head: (id: string) => Answer<'head'>;
  attendance: (input: TeacherStudentMonth) => Answer<'attendance'>;
}
