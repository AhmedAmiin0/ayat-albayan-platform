import type { RouteResult } from '@ab/core';
import type { courseCardRoutes } from '@ab/shared';

type Answer<K extends keyof typeof courseCardRoutes> = Promise<
  RouteResult<(typeof courseCardRoutes)[K]>
>;

/** Whose route reads the card: the admin's file (students.read) or an assistant's screen. */
export type CardTree = 'admin' | 'sales';

export interface StudentPackage {
  studentId: string;
  subscriptionId: string;
}

export interface CourseCardCalls {
  card: (input: { studentId: string; tree: CardTree }) => Answer<'card'>;
  extendPreview: (input: StudentPackage) => Answer<'extendPreview'>;
  extend: (input: StudentPackage) => Answer<'extend'>;
}
