import type { TeacherMe } from '@ab/shared';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/ui/display/empty-state';
import { t } from '@/lib/i18n';
import { myStudentColumns } from './myStudentColumns';

/**
 * «طلابي» (R-TCH-03): the teacher's students (assigned or on an active rule), by name; each name
 * opens that student's «سجل التقارير» (R-REP-05). The account status column is
 * for the home tab; the report history leaves it out (what «مشترك» means is the admin's business).
 * Every column sorts and filters on the loaded list (R-NFR-08).
 */
export function MyStudents({ students, showStatus = true }: { students: TeacherMe['students']; showStatus?: boolean }) {
  const columns = useMemo(() => myStudentColumns(showStatus), [showStatus]);
  if (students.length === 0) return <EmptyState title={t.teacherDash.noStudents} />;
  return (
    <DataTable stacked label={t.teacherDash.myStudents} clientSort clientFilter columns={columns} data={students} getRowId={(s) => s.id} />
  );
}
