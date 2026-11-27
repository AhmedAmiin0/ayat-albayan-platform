import type { PortalStudent } from '@ab/shared';
import { useChildPackage } from '@/portal';

export function usePackageBody(student: PortalStudent) {
  return { pkg: useChildPackage(student.id, true) };
}
