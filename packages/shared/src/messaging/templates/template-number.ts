import { z } from 'zod';
import { templateViewSchema } from './catalog/template-view.schemas';

// Routing per number (docs/23 phase 5, docs/23c decision 9): a template's own number and the per-number
// template sync. Ids only, never a token.

/** PUT /messaging/templates/:key/number: the template's own number; null = its role's default number. */
export const templateNumberSchema = z.object({ number_id: z.uuid().nullable() });
export type TemplateNumberInput = z.infer<typeof templateNumberSchema>;

/**
 * PUT /messaging/templates/:key/number answer. A warning only: the save is never blocked.
 * not_approved_on_number: the chosen number has no approval of this template yet.
 */
export const templateNumberSetViewSchema = z.object({
  template: templateViewSchema,
  not_approved_on_number: z.boolean(),
});
export type TemplateNumberSetView = z.infer<typeof templateNumberSetViewSchema>;
