import { defineRoute } from '@ab/core';
import { bookingBodySchema } from '../../../schemas';
import {
  trialDateConflictsSchema,
  trialDateQuerySchema,
  trialDateResultSchema,
  trialHistorySchema,
} from './trial-date.schemas';

/** A student's trial dates (R-SCH-06) under one base: the admin's or the sales assistant's. */
const trialDateRoutesAt = <B extends string>(base: B) => ({
  /** Newest pick first; 404 student_not_found. */
  history: defineRoute({
    method: 'GET',
    path: `${base}/trial-dates`,
    query: trialDateQuerySchema,
    response: trialHistorySchema,
  }),
  /** 200, nothing written; the trial the new date moves is left out. */
  check: defineRoute({
    method: 'POST',
    path: `${base}/trial-date/check`,
    body: bookingBodySchema,
    response: trialDateConflictsSchema,
  }),
  /** 201; 409 conflict, trial_date_subscribed, trial_changed; 400 trial_date_invalid. */
  pick: defineRoute({
    method: 'POST',
    path: `${base}/trial-date`,
    body: bookingBodySchema,
    response: trialDateResultSchema,
  }),
});

export const trialDateRoutes = trialDateRoutesAt('/booking');

/** Her own students only: 403 not_your_student | override_not_allowed. */
export const salesTrialDateRoutes = trialDateRoutesAt('/sales/booking');
