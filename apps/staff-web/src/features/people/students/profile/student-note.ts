import { isCurrentStudent } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { StudentListItem } from '@ab/shared';

/** Only what the Phase 1 list API backs: a current student with no teacher needs the admin. */
export function studentNote(row: Pick<StudentListItem, 'teacher_name' | 'status'>): string | null {
  return isCurrentStudent(row.status) && row.teacher_name === null ? t.alerts.needsTeacher : null;
}
