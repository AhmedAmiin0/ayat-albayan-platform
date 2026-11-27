import { z } from 'zod';

export const JOIN_STATES = ['early', 'open', 'closed'] as const;
export const joinStateSchema = z.enum(JOIN_STATES);
export type JoinState = z.infer<typeof joinStateSchema>;

export const joinWindowViewSchema = z.object({
  state: joinStateSchema,
  /** ISO instants of the two edges, for opening-time messages. */
  opens_at: z.string(),
  closes_at: z.string(),
});
export type JoinWindow = z.infer<typeof joinWindowViewSchema>;
