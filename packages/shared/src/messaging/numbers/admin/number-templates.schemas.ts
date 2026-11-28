import { id } from '@ab/core';
import { waLineSchema } from '@ab/catalog';
import { z } from 'zod';

/** A number's WABA template list written to message_template_numbers. */
export const templateNumberSyncViewSchema = z.object({
  number_id: id(),
  ok: z.boolean(),
  /**
   * not_configured, meta_error, kapso_auth, crm_auth, crm_scope_missing, crm_managed,
   * evolution_no_templates; calls_no_templates = a calls-only number has no templates.
   */
  error: z.string().optional(),
  /** Meta's own message for meta_error. */
  message: z.string().optional(),
  checked_at: z.string(),
  /** Templates on that WABA (as listed); 0 when not read. */
  meta_count: z.number().int().nonnegative(),
  /** Template keys written for this number. */
  synced: z.number().int().nonnegative(),
  /** Every number written: this one and each other number on the same WABA. */
  number_ids: z.array(id()),
  /** Set when the number ran its line's sync; absent on the per-number WABA sync. */
  line: waLineSchema.optional(),
});
export type TemplateNumberSyncView = z.infer<typeof templateNumberSyncViewSchema>;
