import { portalViewer, readsOwn, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { ChildBody, ChildHead } from '@/features/children';
import { PageBody } from '@ab/web-kit/family/layout/PageBody';

interface Props {
  /** The student in view: a student's own, an only child, or the child a guardian picked. */
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for, and the switch. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

/**
 * «الرئيسية» (docs/50 §6, boards PortalWebHome / PortalWebStudentHome): the emerald hero of the
 * student in view, then القادمة · حضرها · غاب عنها · التسجيلات (and الباقة for a viewer who sees
 * money). A student or an adult reads their own under «أهلًا بك، …»; a guardian the child's
 * (the name on top switches: ChildSwitch).
 */
export function HomePage({ student, kind, tab, onTab }: Props) {
  const own = readsOwn(portalViewer(kind, student));
  return (
    <>
      <ChildHead student={student} own={own} />
      <PageBody>
        <ChildBody student={student} kind={kind} tab={tab} onTab={onTab} />
      </PageBody>
    </>
  );
}
