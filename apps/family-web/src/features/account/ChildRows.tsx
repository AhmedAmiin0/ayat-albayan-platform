import { familyChildren, isSelfChild, type FamilyPick } from '@ab/client-core';
import type { PortalHome, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { SectionHeader } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { useFamilyPick, usePickChild } from '#/features/shell/index.ts';
import { ChildRow } from './ChildRow';

/** The id of the child the pages show now, if one is. */
const shownId = (pick: FamilyPick): string | null =>
  pick.state === 'one' ? pick.student.id : null;

/**
 * «الأبناء» (a guardian only): one row per child, a guardian who studies first as «أنا»; a row
 * makes the pages that child's (like «اختر الطالب») and goes home.
 */
export function ChildRows({ home }: { home: PortalHome }) {
  const navigate = useNavigate();
  const pickChild = usePickChild();
  const shown = shownId(useFamilyPick());
  const choose = (studentId: string) => {
    pickChild(studentId);
    void navigate({ to: '/portal' });
  };
  const labelOf = (student: PortalStudent): string =>
    isSelfChild(home.kind, student) ? t.portal.app.pick.me : student.name;
  return (
    <section aria-labelledby="account-children" className="grid gap-2">
      <SectionHeader id="account-children" title={t.portal.app.account.children} />
      <ul className="grid gap-2">
        {familyChildren(home).map((student) => (
          <li key={student.id}>
            <ChildRow
              student={student}
              label={labelOf(student)}
              current={student.id === shown}
              onChoose={() => choose(student.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
