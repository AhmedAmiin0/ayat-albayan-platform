import type { Tables, TablesInsert } from '@ab/db';

/** One (template, number) approval (docs/23c decision 4). */
export type ApprovalRow = Tables<'message_template_numbers'>;
export type ApprovalWrite = TablesInsert<'message_template_numbers'>;

/** What the per-number routes need of a wa_numbers row (ids only, never a secret). */
export type NumberRef = Pick<Tables<'wa_numbers'>, 'id' | 'purpose' | 'is_default' | 'waba_id'>;
