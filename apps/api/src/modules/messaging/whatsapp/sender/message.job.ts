import type { WaLine } from '@ab/shared';
import { activeNumberId } from '@/common/configuration/integrations/numbers-overlay';
import type { MessageDispatch, SendVia } from './message.dispatch';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import { lineOf } from './send-line';
import type { DueMessage } from './sender.due';
import type { SenderRepo } from './sender.repo';
import { WaError, type TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// The worker's job, outcomes and fixed pieces (split from message.worker.ts for the line limit).

/** paused = the line's (module mode: the number's) token is broken: the sender skips it for this pass. */
/** held = a job-made reminder / follow-up / renewal while automatic messages are OFF (auto_off). */
export type SendOutcome = 'sent' | 'retry' | 'failed' | 'expired' | 'stale' | 'held' | 'paused' | 'skipped';

export interface SendJob {
  row: DueMessage;
  /** The approved registry row of row.template_key; null for a session text. */
  template: TemplateRow | null;
  now: Date;
  /** settings.auto_messages_enabled, read by the sender before this row. */
  autoOn: boolean;
  /**
   * Module mode only (docs/23c): the number routing picked; null = none can send it now (expiry and
   * holds still apply, then it stays queued unclaimed). Absent under legacy: today's line rules.
   */
  route?: NumberRoute | null;
}

/** A job before the gate is read (the sender's pass): what sendingAt needs. */
export type PassJob = Omit<SendJob, 'autoOn'>;

export interface FailedInput {
  row: DueMessage;
  error: unknown;
  attempts: number;
  now: Date;
  line: WaLine;
  route?: NumberRoute | null;
}

/**
 * Writing «sent» after Meta accepted is retried hard. If all tries fail, the claim's SENDING mark
 * stays on the row and the next pass hands it to the admin (UNCERTAIN) instead of resending.
 */
export const RECORD_DELAYS_MS = [500, 2_000] as const;

/** A row still marked SENDING: a try was made and its outcome never recorded. */
export const UNRECORDED = new WaError('the last try was never recorded; check WhatsApp before resending', {
  code: null,
  status: 0,
  uncertain: true,
});

/**
 * The token-broken push subject, one per day: per line under legacy (the notifications subject is
 * unchanged), per number in module mode (docs/23c decision 8).
 */
export function authSubject(at: { line: WaLine; route?: NumberRoute | null; now: Date }): string {
  const day = at.now.toISOString().slice(0, 10);
  if (at.route) return `whatsapp_auth:number:${at.route.numberId}:${day}`;
  return `whatsapp_auth:${at.line === 'chat' ? 'chat:' : ''}${day}`;
}

/** A job's line (its number's role in module mode, else lineOf) and what it is sent through. */
export function sendingAt(job: PassJob, multi: boolean): { line: WaLine; via: SendVia } {
  if (job.route) return { line: job.route.line, via: job.route };
  const line = lineOf(job.row, job.template, multi);
  return { line, via: line };
}

// The claim (before Meta is called).

interface ClaimDeps {
  dispatch: MessageDispatch;
  queries: SenderRepo;
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
