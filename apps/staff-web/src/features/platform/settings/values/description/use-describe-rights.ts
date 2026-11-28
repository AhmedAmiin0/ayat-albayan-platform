import { useQuery } from '@tanstack/react-query';
import { meQuery, usePermissions } from '@ab/web-kit';
import type { DescribeRights } from './description';

/** Rights the description editor checks: the permissions and the base admin role (Google). */
export function useDescribeRights(): DescribeRights {
  const { can } = usePermissions();
  const role = useQuery(meQuery).data?.role;
  return { can, baseAdmin: role === 'admin' };
}
