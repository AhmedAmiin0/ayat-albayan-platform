import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { meQuery, type Me } from '#/auth/index.ts';

type MeRead = Pick<UseQueryResult<Me | null>, 'data' | 'fetchStatus'>;

const isAdmin = (me: MeRead): boolean => me.data?.role === 'admin';
/** /auth/me is on its way and nothing came back yet: never flash the cover over an admin. */
const isBooting = (me: MeRead): boolean => me.data === undefined && me.fetchStatus === 'fetching';

/** Does this staff viewer pass the switch? Reads the /auth/me cache only (never a request). */
export const staffPasses = (me: MeRead): boolean => isAdmin(me) || isBooting(me);

export function useStaffPass(): boolean {
  const me = useQuery({ ...meQuery, enabled: false });
  return staffPasses(me);
}
