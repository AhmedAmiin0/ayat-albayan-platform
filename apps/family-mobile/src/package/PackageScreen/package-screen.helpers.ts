import type { PortalHome } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { studentOf } from '@/portal';
import { seesPackage } from './PackageOf';

/** No package heading for a login that never sees money (a child's, through a stale link). */
export function packageTitle(me: PortalHome | undefined, id: string): string {
  const student = studentOf(me, id);
  if (!me || !student) return '';
  return seesPackage(me, student) ? `${t.portal.packageTab} · ${student.name}` : student.name;
}
