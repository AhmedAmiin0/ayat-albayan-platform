import type { ReceivablesView } from '@ab/money';
import { receivablesRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

/** GET /receivables on one api client; the answer is parsed strictly. */
export function receivablesCall(client: ApiClient): () => Promise<ReceivablesView> {
  const call = callWith(client);
  return () => call({ route: receivablesRoutes.list });
}
