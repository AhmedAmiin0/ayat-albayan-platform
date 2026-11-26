import type { PortalHome } from '@ab/shared';
import { EmptyState, t } from '@ab/mobile-kit';
import { studentOf } from '@/portal';
import { ChildBody } from '@/child/ChildBody';

/** The child's tabs, or the «not linked» note for an id that is not this login's. */
export function ChildOf({ me, id }: { me: PortalHome; id: string }) {
  const student = studentOf(me, id);
  if (!student) return <EmptyState title={t.portal.noStudents} />;
  return <ChildBody student={student} kind={me.kind} />;
}
