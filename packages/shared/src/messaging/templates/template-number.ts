import { z } from 'zod';
import type { TemplateView } from './template-views.js';

// Routing per number (docs/23 phase 5, docs/23c decision 9): a template's own number and the per-number
// template sync. Ids only, never a token.

/** PUT /messaging/templates/:key/number: the template's own number; null = its role's default number. */
export const templateNumberSchema = z.object({ number_id: z.uuid().nullable() });
export type TemplateNumberInput = z.infer<typeof templateNumberSchema>;

/** PUT /messaging/templates/:key/number answer. A warning only: the save is never blocked. */
export interface TemplateNumberSetView {
  template: TemplateView;
  /** The chosen number has no approval of this template yet (sync it, or submit on its WABA). */
  not_approved_on_number: boolean;
}

/** POST /admin/numbers/:id/templates/sync: that number's WABA list → message_template_numbers. */
export interface TemplateNumberSyncView {
  number_id: string;
  ok: boolean;
  /** not_configured, meta_error, kapso_auth. */
  error?: string;
  /** Meta's own message for meta_error. */
  message?: string;
  checked_at: string;
  /** Templates on that WABA (as listed); 0 when not read. */
  meta_count: number;
  /** Template keys written for this number. */
  synced: number;
  /** Every number written: this one and each other number on the same WABA. */
  number_ids: string[];
}
