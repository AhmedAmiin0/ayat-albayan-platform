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
const read = { permissions: ['assistantpay.read'], tags: ['assistant-pay'] } as const;
const write = { permissions: ['assistantpay.write'], tags: ['assistant-pay'] } as const;

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
    ...read,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/assistant-pay/terms/:assistantId',
    params: byAssistant,
    response: assistantTermsViewSchema,
    ...read,
  }),
  setTerms: defineRoute({
    method: 'PUT',
    path: '/assistant-pay/terms/:assistantId',
    params: byAssistant,
    body: assistantTermsSchema,
    response: assistantTermsViewSchema,
    ...write,
  }),
  broughtByOf: defineRoute({
    method: 'GET',
    path: '/assistant-pay/brought-by/:studentId',
    params: z.object({ studentId: id() }),
    response: broughtByViewSchema,
    ...read,
  }),
  ledger: defineRoute({
    method: 'GET',
    path: '/assistant-pay/commissions',
    query: commissionsQuery,
    response: assistantCommissionListSchema,
    ...read,
  }),
  void: defineRoute({
    method: 'POST',
    path: '/assistant-pay/commissions/:id/void',
    params: z.object({ id: id() }),
    body: assistantReasonSchema,
    response: created,
    ...write,
  }),
  adjust: defineRoute({
    method: 'POST',
    path: '/assistant-pay/adjustments',
    body: assistantAdjustmentSchema,
    response: created,
    ...write,
  }),
  broughtBy: defineRoute({
    method: 'POST',
    path: '/assistant-pay/brought-by',
    body: broughtBySchema,
    response: broughtByResultSchema,
    ...write,
  }),
};
