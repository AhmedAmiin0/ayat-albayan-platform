import { z } from 'zod';
import {
  proposalApproveSchema,
  proposalRejectSchema,
  type ProposalApprove,
  type ProposalReject,
} from '../../schemas';

/** A decision sent without a JSON body is the empty one. */
export const approveDecisionSchema = z.preprocess(
  (value: ProposalApprove | null | undefined) => value ?? {},
  proposalApproveSchema,
);
export const rejectDecisionSchema = z.preprocess(
  (value: ProposalReject | null | undefined) => value ?? {},
  proposalRejectSchema,
);
