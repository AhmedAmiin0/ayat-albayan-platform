import { evolutionRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { EvolutionCalls } from './evolution-api.types';

/** An Evolution number's live checks and options on one api client. */
export function evolutionCalls(client: ApiClient): EvolutionCalls {
  const call = callWith(client);
  return {
    state: (id) => call({ route: evolutionRoutes.state, params: { id } }),
    qr: (id) => call({ route: evolutionRoutes.qr, params: { id } }),
    saveConfig: ({ id, config }) =>
      call({ route: evolutionRoutes.saveConfig, params: { id }, body: config }),
    push: (id) => call({ route: evolutionRoutes.push, params: { id } }),
    verify: (id) => call({ route: evolutionRoutes.verify, params: { id } }),
  };
}
