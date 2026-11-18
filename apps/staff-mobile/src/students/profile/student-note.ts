import { isCurrentStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import type { StudentListItem } from '@ab/shared';

/**
 * The row's one «دورك» note, same rule as the web list (staff-web …/student-note.ts): a current
 * (new, trial, pending_subscription, active, pending_renewal or expired) student with no teacher. The only alert the list API can back today.
 * TODO(R-MOB-02): package/report/trial-today notes once the list response carries them.
 */
export function studentNote(row: Pick<StudentListItem, 'teacher_name' | 'status'>): string | null {
  return isCurrentStudent(row.status) && row.teacher_name === null ? t.alerts.needsTeacher : null;
}
