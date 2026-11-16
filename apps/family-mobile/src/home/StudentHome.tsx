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
 * Home is the page of the student in view (docs/50 §6, canvas StudentHome): «أهلًا بك» over their
 * name, then «القادمة» / «حضرها» / «غاب عنها» and «الباقة» for a viewer who sees money (childTabs).
 * A student reads their own; a guardian the child they work as, with the guardian's words.
 */
export function StudentHome({ student, kind }: StudentHomeProps) {
  const refresh = useRefreshPortal();
  return (
    <FamilyPage
      header={
        <GreetingHeader over={t.portal.app.home.greeting} title={student.name} student={student} />
      }
      onRefresh={refresh}
    >
      <ChildBody student={student} kind={kind} />
    </FamilyPage>
  );
}
