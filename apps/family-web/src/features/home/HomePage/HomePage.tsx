import { portalViewer, readsOwn } from '@ab/client-core';
import { t } from '@ab/web-kit';
import { ChildBody, ChildHead } from '@/features/children';
import { NextLessonCard } from '@/features/next-lesson';
import type { Props } from './HomePage.types';

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
