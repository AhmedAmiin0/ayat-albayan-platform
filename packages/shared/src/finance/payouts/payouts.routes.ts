import { defineRoute, id } from '@ab/core';
import {
  monthParam,
  monthQuery,
  payoutGenerateResultSchema,
  payoutListSchema,
  payoutPaySchema,
  payoutViewSchema,
  voidReasonSchema,
} from '@ab/money';
import { z } from 'zod';
import { signedDownloadSchema } from '../../reports';
import { emptyWhenMissing } from '../empty-when-missing';

const byId = z.object({ id: id() });
const read = { permissions: ['payouts.read'], tags: ['payouts'] } as const;
const write = { permissions: ['payouts.write'], tags: ['payouts'] } as const;
const approver = { permissions: ['payouts.approve'], tags: ['payouts'] } as const;
const ownTeacher = { permissions: ['self.teacher'], tags: ['teachers'] } as const;

/** Teacher payouts per month, admin side (docs/11 §8, R-PAY-02). Teacher money is EGP. */
export const payoutRoutes = {
  month: defineRoute({
    method: 'GET',
    path: '/payouts',
    query: monthQuery,
    response: payoutListSchema,
    ...read,
  }),
  generate: defineRoute({
    method: 'POST',
    path: '/payouts/:month/generate',
    params: z.object({ month: monthParam }),
    response: payoutGenerateResultSchema,
    ...write,
  }),
  approve: defineRoute({
    method: 'POST',
    path: '/payouts/:id/approve',
    params: byId,
    response: payoutViewSchema,
    ...approver,
  }),
  /** Approved back to draft, only while not paid. */
  reopen: defineRoute({
    method: 'POST',
    path: '/payouts/:id/reopen',
    params: byId,
    response: payoutViewSchema,
    ...write,
  }),
  /** Paid back to approved: voids the settlement payment, with a reason. */
  unpay: defineRoute({
    method: 'POST',
    path: '/payouts/:id/unpay',
    params: byId,
    body: emptyWhenMissing(voidReasonSchema),
    response: payoutViewSchema,
    ...write,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/payouts/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
    ...read,
  }),
  /** Settlement in the ledger and paid, in one transaction (Y4). */
  pay: defineRoute({
    method: 'POST',
    path: '/payouts/:id/pay',
    params: byId,
    body: emptyWhenMissing(payoutPaySchema),
    response: payoutViewSchema,
    ...write,
  }),
};

/** The signed-in teacher's own payouts (Y5, R-TCH-04): the teacher comes from the token. */
export const myPayoutRoutes = {
  mine: defineRoute({
    method: 'GET',
    path: '/teachers/me/payouts',
    query: z.object({ month: monthParam.optional() }),
    response: payoutListSchema,
    ...ownTeacher,
  }),
};
