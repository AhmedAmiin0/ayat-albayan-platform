import type { PortalKind, PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { ChildBody } from '#/child/index.ts';
import { FamilyPage, GreetingHeader } from '#/nav/index.ts';
import { ownPage, useRefreshPortal } from '#/portal/index.ts';

interface StudentHomeProps {
  student: PortalStudent;
  /** Who reads it: the student or an adult («حضرتها»), or a guardian («حضرها»). */
  kind: PortalKind;
}

/**
 * Home is the page of the student in view (docs/50 §6, canvas StudentHome): their avatar and name,
 * then «القادمة» / «حضرها» / «غاب عنها» and «الباقة» for a viewer who sees money (childTabs).
 * A student or an adult (contact_is_self) reads their own under «أهلًا بك»; a guardian the child
 * they work as under today's date (the greeting would hail the parent by the child's name).
 */
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
