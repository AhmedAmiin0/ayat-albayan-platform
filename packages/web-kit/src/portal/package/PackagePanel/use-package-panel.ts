import { useQuery } from '@tanstack/react-query';
import { portalPackageQuery } from '@ab/web-kit/portal/api';
import type { PackagePanelProps } from './PackagePanel.types';

export function usePackagePanel({ student }: Pick<PackagePanelProps, 'student'>) {
  const query = useQuery(portalPackageQuery(student.id));
  return { query };
}
