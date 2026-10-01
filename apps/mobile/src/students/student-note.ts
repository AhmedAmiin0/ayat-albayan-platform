import { t } from '@/lib/i18n';
import type { StudentListItem } from './types';

/**
 * The row's one «دورك» note, same rule as the web list (apps/web …/student-note.ts): a trial or
 * active student with no teacher. The only alert the list API can back today.
 * TODO(R-MOB-02): package/report/trial-today notes once the list response carries them.
 */
export function studentNote(row: Pick<StudentListItem, 'teacher_name' | 'status'>): string | null {
  const live = row.status === 'trial' || row.status === 'active';
  return live && row.teacher_name === null ? t.alerts.needsTeacher : null;
}
