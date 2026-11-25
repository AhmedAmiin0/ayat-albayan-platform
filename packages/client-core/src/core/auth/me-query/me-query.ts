import type { ApiClient } from '../../http';
import { pathKey } from '../../keys';
import type { MeQuery } from './me-query.types';

const ME_PATH = '/auth/me';

/**
 * GET /auth/me for every reader of the session (role, permissions, tz, locale): one key, so a
 * refetch or an ['auth'] invalidation reaches each of them.
 */
export const meQueryOptions = (client: Pick<ApiClient, 'apiFetch'>): MeQuery => ({
  queryKey: pathKey(ME_PATH),
  queryFn: () => client.apiFetch(ME_PATH),
});
