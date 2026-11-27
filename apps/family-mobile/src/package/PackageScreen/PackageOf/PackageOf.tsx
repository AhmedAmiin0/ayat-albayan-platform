import { EmptyState, t } from '@ab/mobile-kit';
import { studentOf } from '@/portal';
import { PackageBody } from '@/package/PackageBody';
import { seesPackage } from './package-of.helpers';
import type { PackageOfProps } from './PackageOf.types';

/** The package of a student whose login sees money; else the note, and no request is made. */
export function PackageOf({ me, id }: PackageOfProps) {
  const student = studentOf(me, id);
  if (!student || !seesPackage(me, student)) return <EmptyState title={t.portal.packageEmpty} />;
  return <PackageBody student={student} />;
}
