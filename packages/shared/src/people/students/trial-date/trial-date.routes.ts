import { defineRoute, type RouteSpec } from '@ab/core';
import { bookingBodySchema } from '../../../schemas';
import {
  trialDateConflictsSchema,
  trialDateQuerySchema,
  trialDateResultSchema,
  trialHistorySchema,
} from './trial-date.schemas';

type Access = Required<Pick<RouteSpec, 'permissions' | 'tags'>>;

/** A student's trial dates (R-SCH-06) under one base: the admin's or the sales assistant's. */
const trialDateRoutesAt = <B extends string, A extends Access>(base: B, access: A) => ({
  /** Newest pick first; 404 student_not_found. */
  history: defineRoute({
    method: 'GET',
    path: `${base}/trial-dates`,
    query: trialDateQuerySchema,
    response: trialHistorySchema,
    ...access,
  }),
  /** 200, nothing written; the trial the new date moves is left out. */
  check: defineRoute({
    method: 'POST',
    path: `${base}/trial-date/check`,
    body: bookingBodySchema,
    response: trialDateConflictsSchema,
    ...access,
  }),
  /** 201; 409 conflict, trial_date_subscribed, trial_changed; 400 trial_date_invalid. */
  pick: defineRoute({
    method: 'POST',
    path: `${base}/trial-date`,
    body: bookingBodySchema,
    response: trialDateResultSchema,
    ...access,
  }),
});

export const trialDateRoutes = trialDateRoutesAt('/booking', {
  permissions: ['booking.write'],
  tags: ['booking'],
});

/** Her own students only: 403 not_your_student | override_not_allowed. */
export const salesTrialDateRoutes = trialDateRoutesAt('/sales/booking', {
  permissions: ['self.sales'],
  tags: ['booking'],
});
