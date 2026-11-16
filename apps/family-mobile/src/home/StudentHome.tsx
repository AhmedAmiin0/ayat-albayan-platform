import type { PortalKind, PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { ChildBody } from '@/child';
import { FamilyPage, GreetingHeader } from '@/nav';
import { useRefreshPortal } from '@/portal';

interface StudentHomeProps {
  student: PortalStudent;
  /** Who reads it: the student («حضرتها») or their guardian («حضرها», and «الباقة»). */
  kind: PortalKind;
}

/**
 * Home is the page of the student in view (docs/50 §6, canvas StudentHome): their avatar and name,
 * then «القادمة» / «حضرها» / «غاب عنها» and «الباقة» for a viewer who sees money (childTabs).
 * A student reads their own under «أهلًا بك»; a guardian the child they work as under today's
 * date (the greeting would hail the parent by the child's name), with the guardian's words.
 */
export function StudentHome({ student, kind }: StudentHomeProps) {
  const refresh = useRefreshPortal();
  const over = kind === 'student' ? t.portal.app.home.greeting : undefined;
  return (
    <FamilyPage
      header={<GreetingHeader over={over} title={student.name} student={student} />}
      onRefresh={refresh}
    >
      <ChildBody student={student} kind={kind} />
    </FamilyPage>
  );
}
