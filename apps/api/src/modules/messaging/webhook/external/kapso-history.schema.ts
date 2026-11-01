import { z } from 'zod';

// Kapso's history bodies (docs/36 h4): Meta's message objects stay `unknown` here (z4 parses
// them); only the envelope is read.

const objectSchema = z.record(z.string(), z.unknown());

/**
 * One message: `{ data: {…} }`, or the message itself as the body (`data` absent or a list);
 * null for anything else (`{ data: null }`, a string, no body).
 */
export const messageSchema = z
  .union([
    z.looseObject({ data: objectSchema }).transform((body) => body.data),
    z.looseObject({ data: z.array(z.unknown()) }),
    z.looseObject({ data: z.undefined().optional() }),
  ])
  .nullable()
  .catch(null);

const cursorSchema = z
  .looseObject({ cursors: z.looseObject({ after: z.string().optional().catch(undefined) }) })
  .optional()
  .catch(undefined);

/** A page: `data` (not a list → none) and the `paging.cursors.after` cursor, when a string. */
export const historyPageSchema = z
  .looseObject({ data: z.array(z.unknown()).catch([]), paging: cursorSchema })
  .catch({ data: [], paging: undefined });

/** A message object as Kapso sent it, or null. */
export type KapsoMessage = z.infer<typeof messageSchema>;
