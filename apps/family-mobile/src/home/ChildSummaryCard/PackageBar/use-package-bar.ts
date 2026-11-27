import { packageSummary } from '@ab/client-core';
import { useChildPackage } from '@/portal';

export function usePackageBar(studentId: string) {
  const pkg = useChildPackage(studentId, true).data?.package;
  const summary = pkg ? packageSummary(pkg) : null;
  return { summary };
}
