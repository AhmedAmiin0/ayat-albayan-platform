import { isSelfChild } from '@ab/client-core';
import { firstName, type PortalKind, type PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { showSwitched } from '#/nav/index.ts';
import { usePickChild } from '#/portal/index.ts';

/** «تُعرض الآن صفحة يوسف»; a guardian's own row: «تُعرض الآن صفحتك». */
const noticeOf = (kind: PortalKind, student: PortalStudent): string =>
  isSelfChild(kind, student)
    ? t.portal.app.pick.shownSelf
    : t.portal.app.pick.shown.replace('{name}', firstName(student.name) || student.name);

/**
 * A row of the children sheet: work as that child (saved on the phone, every screen follows),
 * close the sheet and say whose page shows (canvas SwitchDone).
 */
export function useSwitchChild(kind: PortalKind): (student: PortalStudent) => void {
  const pick = usePickChild();
  return (student) => {
    pick(student.id);
    showSwitched(noticeOf(kind, student));
  };
}
