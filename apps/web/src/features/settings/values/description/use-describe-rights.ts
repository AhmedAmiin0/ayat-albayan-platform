import { useQuery } from '@tanstack/react-query';
import { meQuery } from '@/features/auth/me';
import { usePermissions } from '@/features/auth/use-permissions';
import type { DescribeRights } from './description';

/** The rights the description editor checks: the permissions, and the base admin role (Google rows). */
export function useDescribeRights(): DescribeRights {
  const { can } = usePermissions();
  const role = useQuery(meQuery).data?.role;
  return { can, baseAdmin: role === 'admin' };
}
