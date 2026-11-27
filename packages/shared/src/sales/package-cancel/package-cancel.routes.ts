import { defineRoute, id } from '@ab/core';
import { subscriptionCancelSchema, type SubscriptionCancel } from '@ab/money';
import { z } from 'zod';
import {
  salesPackageCancelCheckSchema,
  salesPackageCancelledSchema,
} from '../student/package-cancel';

const ACCESS = { permissions: ['subscriptions.stop'], tags: ['sales'] } as const;
const byId = z.object({ id: id() });

/** A request without a JSON body cancels with no reason. */
const cancelBody = z.preprocess(
  (value: SubscriptionCancel | null | undefined) => value ?? {},
  subscriptionCancelSchema,
);

/** The assistant cancels any student's unused package (subscriptions.stop, never .write). */
export const salesPackageCancelRoutes = {
  /** Why the POST would answer 409 (its code), or null; 404 subscription_not_found. */
  check: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/packages/:id/cancel',
    params: byId,
    response: salesPackageCancelCheckSchema,
  }),
  /** 409 already_cancelled, has_payments, has_lessons or has_commission. */
  cancel: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/packages/:id/cancel',
    params: byId,
    body: cancelBody,
    response: salesPackageCancelledSchema,
  }),
};
