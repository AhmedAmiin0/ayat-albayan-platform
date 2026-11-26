import { useQuery } from '@tanstack/react-query';
import { t } from '@ab/web-kit';
import { myStudentsQuery } from '@/features/sales/sales/api';
import { myStudentColumns } from './my-student-columns';
import { PortalList } from './PortalList';

export function MyStudents() {
  return (
    <PortalList
      title={t.assistantPortal.students.title}
      query={useQuery(myStudentsQuery)}
      columns={myStudentColumns}
      getRowId={(s) => s.id}
      empty={{
        title: t.assistantPortal.students.empty,
        hint: t.assistantPortal.students.emptyHint,
      }}
    />
  );
}
