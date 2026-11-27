import { UsedBar } from '@/package';
import type { PackageBarProps } from './PackageBar.types';
import { usePackageBar } from './use-package-bar';

/** Shown only to a viewer who sees money, and absent without a package. */
export function PackageBar({ studentId }: PackageBarProps) {
  const { summary } = usePackageBar(studentId);
  return summary ? <UsedBar summary={summary} /> : null;
}
