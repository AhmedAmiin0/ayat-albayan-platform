import { z } from 'zod';
import { PENDING_IDS_MAX } from '../../thread-delta';
import { onePageMode } from './thread-page-mode';

const pageShape = {
  before: z.iso.datetime({ offset: true }).optional(),
  /** With `before`: the oldest loaded row's id (the compound keyset, docs/37 NEW 4). */
  before_id: z.uuid().optional(),
  /** The window around one message (a search hit, docs/37 NEW 3). */
  around: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};

/** One page of a chat: the newest, an older one or the window around a message. */
export const threadPageQuerySchema = z
  .object({ ...pageShape, after: z.undefined().optional() })
  .superRefine((q, ctx) => {
    for (const code of onePageMode(q)) ctx.addIssue({ code: 'custom', message: code });
  })
  .transform(({ after: _after, ...q }) => ({ mode: 'page' as const, ...q }));
export type ThreadPageQuery = z.output<typeof threadPageQuerySchema>;

/** `pending=<uuid>,<uuid>`: the client's outgoing rows whose status may still move. */
const pendingIds = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').filter(Boolean) : []))
  .pipe(z.array(z.uuid()).max(PENDING_IDS_MAX));

/** What changed after `after`; a delta never mixes with a window or the page keyset. */
export const threadDeltaQuerySchema = z
  .object({
    before_id: pageShape.before_id,
    limit: pageShape.limit,
    after: z.iso.datetime({ offset: true }),
    pending: pendingIds,
    around: z.never().optional(),
  })
  .transform(({ around: _around, ...q }) => ({ mode: 'delta' as const, ...q }));
export type ThreadDeltaQuery = z.output<typeof threadDeltaQuerySchema>;

/** GET /threads/:phone: `after` alone makes it a delta (docs/12 §4 H2). */
export const threadDetailQuerySchema = z.union([threadDeltaQuerySchema, threadPageQuerySchema]);
export type ThreadDetailQuery = z.output<typeof threadDetailQuerySchema>;
