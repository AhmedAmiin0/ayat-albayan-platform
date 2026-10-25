import type { WaLine } from '@ab/shared';
import type { SendVia } from './message.dispatch';
import type { NumberRoute } from './numbers/number-route';
import { lineOf } from './send-line';
import type { DueMessage } from './sender.due';
import { WaError, type TemplateRow } from './whatsapp.types';

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
export function sendingAt(job: SendJob, multi: boolean): { line: WaLine; via: SendVia } {
  if (job.route) return { line: job.route.line, via: job.route };
  const line = lineOf(job.row, job.template, multi);
  return { line, via: line };
}
