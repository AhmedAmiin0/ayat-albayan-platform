import type { CourseChangeCheck, CourseChangeResult } from '@ab/shared';
import type { CourseChangeRequest } from '@ab/schedule';

/** A change body carries its idempotency key, the same on every retry of one flow (rule 8). */
export type ChangeBody = CourseChangeRequest & { clientRequestId: string };

/** One route table's check and change of a course, as the change flow sends them. */
export interface ChangeCalls {
  /** Keeps the checks of two route tables apart in the query cache. */
  key: string;
  check: (body: CourseChangeRequest) => Promise<CourseChangeCheck>;
  change: (body: ChangeBody) => Promise<CourseChangeResult>;
}
