import { ChildBody } from '@/child';
import { FamilyPage, GreetingHeader } from '@/nav';
import type { StudentHomeProps } from './StudentHome.types';
import { useStudentHome } from './use-student-home';

/** A guardian sees today's date, since a greeting would hail the parent by the child's name. */
export function StudentHome({ student, kind }: StudentHomeProps) {
  const { refresh, over } = useStudentHome({ student, kind });
  return (
    <FamilyPage
      header={<GreetingHeader over={over} title={student.name} student={student} />}
      onRefresh={refresh}
    >
      <ChildBody student={student} kind={kind} />
    </FamilyPage>
  );
}
