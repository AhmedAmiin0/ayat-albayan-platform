import { z } from 'zod';

/**
 * The classroom whiteboard's data-channel messages (web board, docs/36 f3). Coordinates are
 * normalised to 0..1 of a fixed 16:9 board; `pts` is flat: [x0, y0, x1, y1, …].
 */

/** Pen colours are theme token names (`--ink`, `--lapis`, …): each viewer resolves its theme. */
export const PEN_COLORS = ['ink', 'lapis', 'cinnabar', 'saffron', 'gold'] as const;
export type PenColor = (typeof PEN_COLORS)[number];

const unit = z.number().min(0).max(1);

export const boardStrokeSchema = z.object({
  id: z.string(),
  /** The author's identity: only they may undo it. */
  by: z.string(),
  color: z.enum(PEN_COLORS),
  /** Line width as a fraction of the board width. */
  width: unit,
  erase: z.boolean(),
  pts: z.array(unit).refine((pts) => pts.length % 2 === 0),
});
export type BoardStroke = z.infer<typeof boardStrokeSchema>;

/**
 * - draw: a new stroke, or more points of one already seen (same id → the points are appended);
 * - allow: «سماح» / «إيقاف كتابة {name}»: one guest may (or may no longer) draw;
 * - sync-request: a late joiner asks; whoever has the board answers with `sync` (chunked);
 * - sync: `allowed` absent (an older client) reads as nobody allowed by name.
 */
export const boardMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('draw'), stroke: boardStrokeSchema }),
  z.object({ t: z.literal('undo'), id: z.string() }),
  z.object({ t: z.literal('clear') }),
  z.object({ t: z.literal('perm'), studentsCanDraw: z.boolean() }),
  z.object({ t: z.literal('open'), open: z.boolean() }),
  z.object({ t: z.literal('allow'), who: z.string(), allow: z.boolean() }),
  z.object({ t: z.literal('sync-request') }),
  z.object({
    t: z.literal('sync'),
    strokes: z.array(boardStrokeSchema),
    studentsCanDraw: z.boolean(),
    open: z.boolean(),
    allowed: z.array(z.string()).default([]),
  }),
]);
export type BoardMessage = z.infer<typeof boardMessageSchema>;
export type BoardKind = BoardMessage['t'];
