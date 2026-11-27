import { isSelfChild, type FamilyPick } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { t } from '@ab/web-kit';
import { useFamilyPick, usePickChild } from '@/features/shell';
import type { ChildRowsProps } from './ChildRows.types';

/** The id of the child the pages show now, if one is. */
const shownId = (pick: FamilyPick): string | null =>
  pick.state === 'one' ? pick.student.id : null;
export function useChildRows({ home }: Pick<ChildRowsProps, 'home'>) {
  const navigate = useNavigate();
  const pickChild = usePickChild();
  const shown = shownId(useFamilyPick());
  const choose = (studentId: string) => {
    pickChild(studentId);
    void navigate({ to: '/portal' });
  };
  const labelOf = (student: PortalStudent): string =>
    isSelfChild(home.kind, student) ? t.portal.app.pick.me : student.name;
  return { shown, choose, labelOf };
}
