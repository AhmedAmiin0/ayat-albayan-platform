import { lessonProposalRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { ProposalDecisionCalls } from './proposal-calls.types';

/** Pending proposals, approve and reject for staff; answers parsed strictly. */
export function proposalDecisionCalls(client: ApiClient): ProposalDecisionCalls {
  const call = callWith(client);
  return {
    pending: () => call({ route: lessonProposalRoutes.pending }),
    approve: (params, body) => call({ route: lessonProposalRoutes.approve, params, body }),
    reject: (params, body) => call({ route: lessonProposalRoutes.reject, params, body }),
  };
}
