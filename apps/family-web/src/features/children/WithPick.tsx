import type { FamilyPick } from '@ab/client-core';
import type { PortalHome, PortalStudent } from '@ab/shared';
import { Fragment, type ReactNode } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { PageBody } from '@ab/web-kit/components/family/layout/PageBody';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useFamilyPick, WithHome } from '@/features/shell';
import { PickChildPage } from './PickChildPage';

type Page = (student: PortalStudent, home: PortalHome) => ReactNode;
type Waiting = Exclude<FamilyPick['state'], 'one'>;

/** No student in view yet: the saved pick loading, «اختر الطالب», or no student linked. */
const WAITING: Readonly<Record<Waiting, (home: PortalHome) => ReactNode>> = {
  loading: () => <PageBody><ListSkeleton rows={3} /></PageBody>,
  choose: (home) => <PickChildPage home={home} />,
  empty: () => (
    <PageBody>
      <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>
    </PageBody>
  ),
};

function Picked({ home, page }: { home: PortalHome; page: Page }) {
  const pick = useFamilyPick();
  if (pick.state !== 'one') return <>{WAITING[pick.state](home)}</>;
  // A new pick starts the page afresh (its first tab).
  return <Fragment key={pick.student.id}>{page(pick.student, home)}</Fragment>;
}

/**
 * A page of the student in view (owner 2026-11-16, docs/50 §6): a student's own, an only child or
 * the child a guardian picked; «اختر الطالب» in its place until a guardian of several picks.
 */
export function WithPick({ children }: { children: Page }) {
  return <WithHome>{(home) => <Picked home={home} page={children} />}</WithHome>;
}
