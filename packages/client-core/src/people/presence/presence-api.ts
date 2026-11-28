import { presenceRoutes, type PresenceSelf, type StaffPresence } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

/** GET /presence/me on one api client; the answer is parsed strictly. */
export function presenceSelfCall(client: ApiClient): () => Promise<PresenceSelf> {
  const call = callWith(client);
  return () => call({ route: presenceRoutes.self });
}

/** GET /presence/staff (admin) on one api client; the answer is parsed strictly. */
export function staffPresenceCall(client: ApiClient): () => Promise<StaffPresence> {
  const call = callWith(client);
  return () => call({ route: presenceRoutes.staff });
}
