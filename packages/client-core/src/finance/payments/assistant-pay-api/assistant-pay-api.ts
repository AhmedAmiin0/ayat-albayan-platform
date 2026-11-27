import { assistantPayRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { AssistantPayCalls } from './assistant-pay-api.types';

/** An admin's view of the assistants' terms, commission ledger and attribution. */
export function assistantPayCalls(client: ApiClient): AssistantPayCalls {
  const call = callWith(client);
  return {
    terms: () => call({ route: assistantPayRoutes.list }),
    saveTerms: (assistantId, body) =>
      call({ route: assistantPayRoutes.setTerms, params: { assistantId }, body }),
    ledger: (query) => call({ route: assistantPayRoutes.ledger, query }),
    voidCommission: (id, reason) =>
      call({ route: assistantPayRoutes.void, params: { id }, body: { reason } }),
    broughtByOf: (studentId) =>
      call({ route: assistantPayRoutes.broughtByOf, params: { studentId } }),
    setBroughtBy: (body) => call({ route: assistantPayRoutes.broughtBy, body }),
  };
}
