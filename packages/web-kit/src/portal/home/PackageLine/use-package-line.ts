import { packageSummary } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { portalPackageQuery } from '@ab/web-kit/portal/api';
import type { PackageLineProps } from './PackageLine.types';

export function usePackageLine({ studentId }: PackageLineProps) {
  const summary = useQuery({
    ...portalPackageQuery(studentId),
    select: (view) => view.package && packageSummary(view.package),
  }).data;
  return { summary };
}
