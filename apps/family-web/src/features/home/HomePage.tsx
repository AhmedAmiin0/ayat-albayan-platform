import { portalViewer, readsOwn, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { t } from '@ab/web-kit/i18n';
import { ChildBody, ChildHead } from '#/features/children/index.ts';
import { NextLessonCard } from '#/features/next-lesson/index.ts';

interface Props {
  /** The student in view: a student's own, an only child, or the child a guardian picked. */
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for, and the switch. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

/**
 * «الرئيسية» (docs/50 §6, canvas StudentHome): the page of the student in view, its next lesson
 * first (owner 2026-11-19: when, countdown, «ادخل الحلقة»), then القادمة · حضرها ·
 * غاب عنها · التسجيلات (and الباقة for a viewer who sees money). A student or an adult reads their
 * own under «أهلًا بك»; a guardian the child's (the name on top switches: ChildSwitch).
 */
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
