import type { WaLine } from '@ab/shared';
import { activeNumberId } from '@/common/integrations/numbers-overlay';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { MessageDispatch } from './message.dispatch';
import type { DueMessage } from './sender.due';
import type { SenderQueries } from './sender.queries';

// The worker's claim (split from message.worker.ts for the line limit).

interface ClaimDeps {
  dispatch: MessageDispatch;
  queries: SenderQueries;
}

interface ClaimInput {
  row: DueMessage;
  now: Date;
  line: WaLine;
  route?: NumberRoute | null;
}

/**
 * null = not ours to send now: the line is unconfigured or the recipient is off the allow-list
 * (the row waits untouched, docs/12 §13.3), or another worker claimed it first. The claim
 * stamps the line only when two lines are in use (§13.2), and the number in module mode (docs/23
 * phase 3).
 */
export async function claimRow(deps: ClaimDeps, input: ClaimInput): Promise<number | null> {
  const { row, now, line, route } = input;
  if (route !== undefined) return claimNumber(deps, { row, now, route });
  if (!deps.dispatch.ready(row, line)) return null;
  const numberId = activeNumberId(line);
  return deps.queries.claim({
    id: row.id,
    attempts: row.attempts,
    now,
    ...(deps.dispatch.multi ? { line } : {}),
    ...(numberId ? { numberId } : {}),
  });
}

/** Module mode (decision 8): only a number that can send now; stamps number_id, line = its role. */
function claimNumber(
  deps: ClaimDeps,
  input: { row: DueMessage; now: Date; route: NumberRoute | null },
): Promise<number | null> {
  const { row, now, route } = input;
  if (!route || !deps.dispatch.ready(row, route)) return Promise.resolve(null);
  const { line, numberId } = route;
  return deps.queries.claim({ id: row.id, attempts: row.attempts, now, line, numberId });
}
