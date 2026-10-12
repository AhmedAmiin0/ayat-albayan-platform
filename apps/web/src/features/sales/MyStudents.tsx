import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { myStudentsQuery } from './api';
import { myStudentColumns } from './my-student-columns';
import { PortalList } from './PortalList';

/** «طلابي» on /sales/students: the students I brought, when, whether their first subscription is paid, and my commission on each. */
export function MyStudents() {
  return (
    <PortalList
      title={t.assistantPortal.students.title}
      query={useQuery(myStudentsQuery)}
      columns={myStudentColumns}
      getRowId={(s) => s.id}
      empty={{ title: t.assistantPortal.students.empty, hint: t.assistantPortal.students.emptyHint }}
    />
  );
}
