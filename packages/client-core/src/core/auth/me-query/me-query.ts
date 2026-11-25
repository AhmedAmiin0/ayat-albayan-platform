import type { ApiClient } from '../../http/index.js';
import { pathKey } from '../../keys/index.js';
import type { MeQuery } from './me-query.types.js';

const ME_PATH = '/auth/me';

/**
 * GET /auth/me for every reader of the session (role, permissions, tz, locale): one key, so a
 * refetch or an ['auth'] invalidation reaches each of them.
 */
export const meQueryOptions = (client: Pick<ApiClient, 'apiFetch'>): MeQuery => ({
  queryKey: pathKey(ME_PATH),
  queryFn: () => client.apiFetch(ME_PATH),
});
