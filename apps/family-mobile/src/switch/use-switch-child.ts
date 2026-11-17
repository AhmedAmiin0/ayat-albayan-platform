import type { PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { showSwitched } from '@/nav';
import { usePickChild } from '@/portal';

/** «يوسف أحمد» → «يوسف»: the note names the child as the family calls them. */
const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/**
 * A row of the children sheet: work as that child (saved on the phone, every screen follows),
 * close the sheet and say «تُعرض الآن صفحة …» (canvas SwitchDone).
 */
export function useSwitchChild(): (student: PortalStudent) => void {
  const pick = usePickChild();
  return (student) => {
    pick(student.id);
    showSwitched(t.portal.app.pick.shown.replace('{name}', firstName(student.name)));
  };
}
