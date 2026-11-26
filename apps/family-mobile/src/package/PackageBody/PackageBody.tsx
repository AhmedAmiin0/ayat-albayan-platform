import { LoadState } from '@/ui';
import type { PackageBodyProps } from './PackageBody.types';
import { PackageView } from './PackageView';
import { usePackageBody } from './use-package-body';

/** docs/50 §2: only for a viewer who sees money (the caller checks seesMoney). */
export function PackageBody({ student }: PackageBodyProps) {
  const { pkg } = usePackageBody(student);
  return <LoadState query={pkg}>{(view) => <PackageView view={view} tz={student.tz} />}</LoadState>;
}
