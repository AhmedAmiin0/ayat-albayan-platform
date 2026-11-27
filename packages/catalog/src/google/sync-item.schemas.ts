import { id, instant } from '@ab/core';
import { z } from 'zod';
import { GOOGLE_SKIP_REASONS, GOOGLE_SYNC_KINDS, GOOGLE_SYNC_STATES } from './enums';

/** dry_run: the request the live mode would send (never a token, never a file body). */
export const googlePlannedRequestSchema = z.object({
  method: z.string(),
  target: z.string(),
  summary: z.string(),
});
export type GooglePlannedRequest = z.infer<typeof googlePlannedRequestSchema>;

/** GET /admin/google/items: one sync item, newest first. */
export const googleSyncItemViewSchema = z.object({
  id: id(),
  kind: z.enum(GOOGLE_SYNC_KINDS),
  state: z.enum(GOOGLE_SYNC_STATES),
  skip_reason: z.enum(GOOGLE_SKIP_REASONS).nullable(),
  /** Who/what it is about: the student's name and the lesson or report date. */
  subject: z.string(),
  google_id: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  last_error: z.string().nullable(),
  planned: googlePlannedRequestSchema.nullable(),
  updated_at: instant,
});
export type GoogleSyncItemView = z.infer<typeof googleSyncItemViewSchema>;

/** POST /admin/google/reconcile: how many items were queued again. */
export const googleReconcileSchema = z.object({ queued: z.number().int().nonnegative() });
export type GoogleReconcile = z.infer<typeof googleReconcileSchema>;
