import { t } from '@/lib/i18n';
import type { StudentListItem } from './types';

/**
 * The one hamish (marginal) note of a students row, docs/07 §6. Only what the Phase 1 list API can
 * back: a trial/active student with no teacher is the admin's job now («دورك», saffron).
 * TODO(R-SUB-02, R-REP-03, R-SCH-02): «فاضل حلقتين» / «الباقة خلصت», «تقرير ما اتبعتش» and
 * «تجريبية النهارده» once packages, reports and lessons are in the list response.
 */
export function studentNote(row: Pick<StudentListItem, 'teacher_name' | 'status'>): string | null {
  const live = row.status === 'trial' || row.status === 'active';
  return live && row.teacher_name === null ? t.alerts.needsTeacher : null;
}
