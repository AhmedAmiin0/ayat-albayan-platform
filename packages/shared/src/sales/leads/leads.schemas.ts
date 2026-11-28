import { LEAD_SOURCES, LEAD_STATUSES } from '@ab/catalog';
import { instant, pageQuery } from '@ab/core';
import { z } from 'zod';
import { FOLLOW_UP_NOTES } from '../../messaging';
import { leadColumnQueryShape } from '../../people/schemas';

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const leadSourceSchema = z.enum(LEAD_SOURCES);
/** 'lead' means they opted out, so resuming needs the admin's explicit confirm (R-LEAD-05). */
export const LEAD_PAUSERS = ['lead', 'admin'] as const;
export const leadPauserSchema = z.enum(LEAD_PAUSERS);
export const followUpNoteSchema = z.enum(FOLLOW_UP_NOTES);

/** PATCH /leads/:id/status: the target; the LeadStateMachine decides if the move is legal. */
export const leadStatusBodySchema = z.object({ status: leadStatusSchema });
export type LeadStatusBody = z.infer<typeof leadStatusBodySchema>;

/** A leads row as a write answers it; the jsonb qualification keeps whatever shape it was given. */
export const leadRowSchema = z.object({
  id: z.string(),
  phone_e164: z.string(),
  name: z.string().nullable(),
  source: leadSourceSchema,
  status: leadStatusSchema,
  tz: z.string().nullable(),
  qualification: z.record(z.string(), z.unknown()),
  assigned_to: z.string().nullable(),
  converted_guardian_id: z.string().nullable(),
  follow_up_paused: z.boolean(),
  follow_up_paused_by: leadPauserSchema.nullable(),
  follow_up_stage: z.number().int(),
  follow_up_note: followUpNoteSchema.nullable(),
  next_follow_up_at: instant.nullable(),
  last_inbound_at: instant.nullable(),
  last_outbound_at: instant.nullable(),
  created_by: z.string().nullable(),
  created_at: instant,
  updated_at: instant,
});
export type LeadRowView = z.infer<typeof leadRowSchema>;

/** GET /leads: status, source, search text, paging and the column sort (R-LEAD-01, R-NFR-08). */
export const leadListQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  ...pageQuery({ size: 25 }),
  q: z.string().optional(),
  ...leadColumnQueryShape,
});
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type LeadListQueryInput = z.input<typeof leadListQuerySchema>;

/** A GET /leads row: every lead column and the name of the salesperson who follows it up. */
export const leadListItemSchema = leadRowSchema.extend({ assigned_to_name: z.string().nullable() });
export type LeadListItem = z.infer<typeof leadListItemSchema>;
