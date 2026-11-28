import { startDateEditRoutes, type StartDateEditResult } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

/** PATCH /subscriptions/:id/start-date on one api client; the answer is parsed strictly. */
export function startDateEditCall(
  client: ApiClient,
): (id: string, startsOn: string) => Promise<StartDateEditResult> {
  const call = callWith(client);
  return (id, startsOn) =>
    call({ route: startDateEditRoutes.edit, params: { id }, body: { startsOn } });
}
