import type { FamilyPick } from '@ab/client-core';
import type { PortalHome, PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { EmptyState, ListSkeleton } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { useFamilyPick, WithHome } from '#/features/shell/index.ts';
import { PickChildPage } from './PickChildPage';

type Page = (student: PortalStudent, home: PortalHome) => ReactNode;
type Waiting = Exclude<FamilyPick['state'], 'one'>;

/** No student in view yet: the saved pick loading, «اختر الطالب», or no student linked. */
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

/**
 * A page of the student in view (owner 2026-11-16, docs/50 §6): a student's own, an only child or
 * the child a guardian picked; «اختر الطالب» in its place until a guardian of several picks.
 */
export function WithPick({ children }: { children: Page }) {
  return <WithHome>{(home) => <Picked home={home} page={children} />}</WithHome>;
}
