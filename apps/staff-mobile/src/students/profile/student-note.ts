import { isCurrentStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import type { StudentListItem } from '@ab/shared';

/** Same rule as the web list: a current student with no teacher (R-MOB-02). */
export function studentNote(row: Pick<StudentListItem, 'teacher_name' | 'status'>): string | null {
  return isCurrentStudent(row.status) && row.teacher_name === null ? t.alerts.needsTeacher : null;
}
