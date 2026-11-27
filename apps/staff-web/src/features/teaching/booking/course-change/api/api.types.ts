import type { CourseChangeCheck, CourseChangeResult } from '@ab/shared';
import type { CourseChangeRequest } from '@ab/schedule';

/** The POST /…/change body: the check's plus its idempotency key (one per dialog, rule 8). */
export type CourseChangeBody = CourseChangeRequest & { clientRequestId: string };

/** One route table's check and change of a course, as the course-change form sends them. */
export interface CourseChangeTarget {
  /** Keeps the checks of two route tables apart in the query cache. */
  key: string;
  check: (body: CourseChangeRequest) => Promise<CourseChangeCheck>;
  change: (body: CourseChangeBody) => Promise<CourseChangeResult>;
  /** The target's own refusal codes' text; null = the booking's (lessonErrorText). */
  errorText?: ((error: unknown) => string | null) | undefined;
}
