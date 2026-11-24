import { portalViewer, readsOwn, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildBody, ChildHead } from '@/features/children';
import { NextLessonCard } from '@/features/next-lesson';

interface Props {
  /** The student in view: a student's own, an only child, or the child a guardian picked. */
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for, and the switch. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

/** docs/50 §6: next lesson first; a guardian sees the child's page, switched from the top. */
export function HomePage({ student, kind, tab, onTab }: Props) {
  const own = readsOwn(portalViewer(kind, student));
  return (
    <div className="grid gap-4">
      <ChildHead student={student} over={own ? t.portal.app.home.greeting : undefined} />
      <NextLessonCard student={student} own={own} />
      <ChildBody student={student} kind={kind} tab={tab} onTab={onTab} exceptNext />
    </div>
  );
}
