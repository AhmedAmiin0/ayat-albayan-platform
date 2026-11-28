import { shortLinkRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ShortLinkSends } from './short-links-sends.types';

// Each write takes a single input, ready for a TanStack `mutationFn` (docs/19).

export function shortLinkSends(client: ApiClient): ShortLinkSends {
  const call = callWith(client);
  return {
    create: (body) => call({ route: shortLinkRoutes.create, body }),
    update: ({ code, body }) => call({ route: shortLinkRoutes.update, params: { code }, body }),
    revoke: (code) => call({ route: shortLinkRoutes.revoke, params: { code } }),
    resend: (code) => call({ route: shortLinkRoutes.resend, params: { code } }),
  };
}
