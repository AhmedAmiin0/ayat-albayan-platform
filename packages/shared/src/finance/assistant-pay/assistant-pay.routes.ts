import { defineRoute, id, instant } from '@ab/core';
import {
  ASSISTANT_COMMISSION_STATUSES,
  assistantAdjustmentSchema,
  assistantCommissionListSchema,
  assistantReasonSchema,
  assistantTermsListSchema,
  assistantTermsSchema,
  assistantTermsViewSchema,
  broughtByResultSchema,
  broughtBySchema,
  broughtByViewSchema,
} from '@ab/money';
import { z } from 'zod';

const byAssistant = z.object({ assistantId: id() });
const created = z.object({ id: z.string() });

/** The ledger of every assistant, narrowed by assistant, status and when earned. */
export const commissionsQuery = z.object({
  assistantId: z.uuid().optional(),
  status: z.enum(ASSISTANT_COMMISSION_STATUSES).optional(),
  from: instant.optional(),
  to: instant.optional(),
});

/**
 * The admin side of the assistants' pay (R-ASST-02, R-ASST-03, R-ASST-05): terms, the commission
 * ledger, voiding, adjustments and attribution.
 */
export const assistantPayRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/assistant-pay/terms',
    response: assistantTermsListSchema,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/assistant-pay/terms/:assistantId',
    params: byAssistant,
    response: assistantTermsViewSchema,
  }),
  setTerms: defineRoute({
    method: 'PUT',
    path: '/assistant-pay/terms/:assistantId',
    params: byAssistant,
    body: assistantTermsSchema,
    response: assistantTermsViewSchema,
  }),
  broughtByOf: defineRoute({
    method: 'GET',
    path: '/assistant-pay/brought-by/:studentId',
    params: z.object({ studentId: id() }),
    response: broughtByViewSchema,
  }),
  ledger: defineRoute({
    method: 'GET',
    path: '/assistant-pay/commissions',
    query: commissionsQuery,
    response: assistantCommissionListSchema,
  }),
  void: defineRoute({
    method: 'POST',
    path: '/assistant-pay/commissions/:id/void',
    params: z.object({ id: id() }),
    body: assistantReasonSchema,
    response: created,
  }),
  adjust: defineRoute({
    method: 'POST',
    path: '/assistant-pay/adjustments',
    body: assistantAdjustmentSchema,
    response: created,
  }),
  broughtBy: defineRoute({
    method: 'POST',
    path: '/assistant-pay/brought-by',
    body: broughtBySchema,
    response: broughtByResultSchema,
  }),
};
