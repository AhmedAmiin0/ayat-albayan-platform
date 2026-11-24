import { coursePauseProblem } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { badRequest, notFound } from '@/common/http/errors';
import type { CoursePauseRepo } from '@/modules/teaching/course-pause/course-pause.repo';

// The checks the pause's writes and its previews share (one copy for both).

/** 404 student_not_found before anything is read or written. */
export async function assertStudent(
  repo: Pick<CoursePauseRepo, 'studentExists'>,
  studentId: string,
): Promise<void> {
  if (!(await repo.studentExists(studentId))) throw notFound('student_not_found');
}

/** 400 with the dates' problem (from in the past, until before from, …). */
export function assertPauseDates(from: string, until: string | null): void {
  const problem = coursePauseProblem({ from, until, today: riyadhToday() });
  if (problem) throw badRequest(problem);
}
