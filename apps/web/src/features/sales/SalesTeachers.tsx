import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { salesTeachersQuery } from './academy-api';
import { PortalList } from './PortalList';
import { salesTeacherColumns } from './sales-teacher-columns';

/** /sales/teachers «المعلمون»: every active teacher with the students they teach (read-only, no pay). */
export function SalesTeachers() {
  return (
    <PortalList
      title={t.sales.teachers.title}
      query={useQuery(salesTeachersQuery)}
      columns={salesTeacherColumns}
      getRowId={(tc) => tc.id}
      empty={{ title: t.sales.teachers.empty, hint: t.sales.teachers.emptyHint }}
    />
  );
}
