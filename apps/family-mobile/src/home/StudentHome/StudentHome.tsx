import type { PortalKind, PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { ChildBody } from '@/child';
import { FamilyPage, GreetingHeader } from '@/nav';
import { ownPage, useRefreshPortal } from '@/portal';

interface StudentHomeProps {
  student: PortalStudent;
  /** Who reads it: the student or an adult, or a guardian; the wording differs. */
  kind: PortalKind;
}

/** A guardian sees today's date, since a greeting would hail the parent by the child's name. */
export function StudentHome({ student, kind }: StudentHomeProps) {
  const refresh = useRefreshPortal();
  const over = ownPage(kind, student) ? t.portal.app.home.greeting : undefined;
  return (
    <FamilyPage
      header={<GreetingHeader over={over} title={student.name} student={student} />}
      onRefresh={refresh}
    >
      <ChildBody student={student} kind={kind} />
    </FamilyPage>
  );
}
