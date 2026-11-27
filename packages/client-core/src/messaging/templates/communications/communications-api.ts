import { communicationsRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CommunicationsCalls } from './communications-api.types';

/** Legacy vs module parity and the read switch, on one api client. */
export function communicationsCalls(client: ApiClient): CommunicationsCalls {
  const call = callWith(client);
  return {
    parity: () => call({ route: communicationsRoutes.parity }),
    setSource: (source) => call({ route: communicationsRoutes.source, body: { source } }),
  };
}
