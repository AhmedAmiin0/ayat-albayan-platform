import { numbersRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { NumbersCalls } from './numbers-api.types';

/** The academy's WhatsApp numbers on one api client; secrets are written, never read. */
export function numbersCalls(client: ApiClient): NumbersCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: numbersRoutes.list }),
    ownTraffic: () => call({ route: numbersRoutes.ownTraffic }),
    create: (body) => call({ route: numbersRoutes.create, body }),
    update: ({ id, body }) => call({ route: numbersRoutes.update, params: { id }, body }),
    remove: (id) => call({ route: numbersRoutes.remove, params: { id } }),
    putSecret: ({ value, ...params }) =>
      call({ route: numbersRoutes.setSecret, params, body: { value } }),
    clearSecret: (params) => call({ route: numbersRoutes.clearSecret, params }),
    import: (dryRun) => call({ route: numbersRoutes.import, body: { dryRun } }),
  };
}
