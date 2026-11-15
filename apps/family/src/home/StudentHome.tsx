import type { PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { ChildBody } from '@/child';
import { FamilyPage, GreetingHeader } from '@/nav';
import { useRefreshPortal } from '@/portal';


/**
 * A student's home is their own page (docs/50 §6, canvas StudentHome): «أهلًا بك» over their
 * name, then «القادمة» / «حضرتها» / «غبت عنها» (and «الباقة» for an adult who pays: childTabs).
 */
export function StudentHome({ student }: { student: PortalStudent }) {
  const refresh = useRefreshPortal();
  return (
    <FamilyPage
      header={
        <GreetingHeader over={t.portal.app.home.greeting} title={student.name} student={student} />
      }
      onRefresh={refresh}
    >
      <ChildBody student={student} kind="student" />
    </FamilyPage>
  );
}
