import type { StudentBalanceView, TeacherBalanceView } from '@ab/shared';

/** What a teacher may read of a student's packages: lesson counts only, no price, paid or fx. */
export function toTeacherBalance(view: StudentBalanceView): TeacherBalanceView {
  return {
    student_id: view.student_id,
    remaining: view.remaining,
    packages: view.packages.map((p) => p.balance),
  };
}
