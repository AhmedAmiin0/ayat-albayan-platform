import type { FamilyPick } from '@ab/client-core';
import type { PortalHome, PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { EmptyState, ListSkeleton, t } from '@ab/web-kit';
import { useFamilyPick, WithHome } from '@/features/shell';
import { PickChildPage } from './PickChildPage';

type Page = (student: PortalStudent, home: PortalHome) => ReactNode;
type Waiting = Exclude<FamilyPick['state'], 'one'>;

const WAITING: Readonly<Record<Waiting, (home: PortalHome) => ReactNode>> = {
  loading: () => <ListSkeleton rows={3} />,
  choose: (home) => <PickChildPage home={home} />,
  empty: () => <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>,
};

function Picked({ home, page }: { home: PortalHome; page: Page }) {
  const pick = useFamilyPick();
  if (pick.state !== 'one') return <>{WAITING[pick.state](home)}</>;
  // A new pick starts the page afresh (its first tab) and fades in: the switch reads as a new
  // child's page, not a flicker of the old one (--duration-quick, opacity only).
  return (
    <div key={pick.student.id} className="grid animate-fade-in gap-5">
      {page(pick.student, home)}
    </div>
  );
}

/** docs/50 §6: the picker shows in place until a guardian of several picks. */
export function WithPick({ children }: { children: Page }) {
  return <WithHome>{(home) => <Picked home={home} page={children} />}</WithHome>;
}
