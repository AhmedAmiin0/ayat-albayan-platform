import { z } from 'zod';

// docs/42 42-7 / 42-8: what a «run now» may say. `lane`: which of the job's lanes to run (the
// sender: chat | main; other jobs ignore it). `wait`: the caller waits for the pass (Outbox.send
// only).

const laneName = z.string().regex(/^[a-z]{1,16}$/);

export const kickOptionsSchema = z.object({
  lane: laneName.optional(),
  wait: z.boolean().optional(),
});
export type KickOptions = z.infer<typeof kickOptionsSchema>;

/** Anything a caller passed: a bad shape is no options (a plain kick), never a throw. */
export const kickOptionsOf = (given: unknown): KickOptions =>
  kickOptionsSchema.safeParse(given ?? {}).data ?? {};

/** The internal route's query: `?lane=chat&wait=1` (jobs.controller parses it with @ZodQuery). */
export const kickQuerySchema = z.object({ lane: laneName.optional(), wait: z.literal('1').optional() });
export type KickQuery = z.infer<typeof kickQuerySchema>;

/** The route's parsed query as options. */
export const kickOptionsOfQuery = (query: KickQuery): KickOptions => ({
  ...(query.lane ? { lane: query.lane } : {}),
  wait: query.wait === '1',
});

/** Options as the route's query (undefined values are left out of the URL). */
export const kickQueryOf = (o: KickOptions): Record<string, string | undefined> => ({
  lane: o.lane,
  wait: o.wait ? '1' : undefined,
});
