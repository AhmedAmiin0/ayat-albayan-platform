import { z } from 'zod';

// docs/42 42-7: the sender's two lanes. `chat` = rows stamped with the chat line (staff texts,
// files, reactions, the reopen template); `main` = everything else (notifications, producer
// templates).
// Each lane has its own ticker, so a chat text never waits behind a notifications burst.

const LANES = ['chat', 'main'] as const;
export const laneSchema = z.enum(LANES);
export type Lane = z.infer<typeof laneSchema>;

/** PostgREST `or` for the rows a lane's pass reads (AND-ed with due()'s own filters). */
export const LANE_ROWS: Record<Lane, string> = {
  chat: 'line.eq.chat',
  main: 'line.is.null,line.neq.chat',
};

/** The lane a queued row is drained by (the kick after an enqueue names it). */
export const laneOfRow = (row: { line?: string | null }): Lane =>
  row.line === 'chat' ? 'chat' : 'main';

/** A kick's lane, or every lane when it names none (or one this sender does not have). */
export const lanesOf = (lane: string | undefined): readonly Lane[] => {
  const named = laneSchema.safeParse(lane);
  return named.success ? [named.data] : LANES;
};
