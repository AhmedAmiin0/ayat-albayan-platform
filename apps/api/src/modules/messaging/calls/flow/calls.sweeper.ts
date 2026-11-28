import { Injectable, Logger, Optional } from '@nestjs/common';
import type { CallEndReason } from '@ab/shared';
import { CallsGate } from '@/modules/messaging/calls/access/calls-gate';
import { callingLine } from '@/modules/messaging/calls/kapso/calling-line';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';
import { logCallError } from './call-errors';
import { CallsKit } from './call-kit';
import { BackgroundJob } from '@/config/role/background-job';
import { Ticker, TickerJob } from '@/common/jobs';

/** An outbound call nobody answered within this is ended (and terminated on WhatsApp). */
export const UNANSWERED_MS = 45_000;
/** An inbound call still ringing this long (its terminate webhook lost) is a missed call. */
const RINGING_MS = 60_000;
/** An accept that never completed. */
const ACCEPTING_MS = 30_000;
/** A call still «active» this long lost its terminate webhook. */
const ACTIVE_MS = 4 * 3_600_000;
const EVERY_MS = 10_000;
/** Calls ON and none live: one look a minute (a wake() sweeps from the next 10 s tick). */
export const IDLE_MS = 60_000;

type Overdue = CallEndReason | 'hangup';

/**
 * How long a live row may stay as it is, from when it got there, and how it ends after that: rings
 * from started_at, an accept from its claim (updated_at, set by the claim's write), talk from
 * answered_at.
 */
interface Limit {
  ms: number;
  since: string;
  why: Overdue;
}

const ringLimit = (row: CallRow): Limit =>
  row.direction === 'outbound'
    ? { ms: UNANSWERED_MS, since: row.started_at, why: 'no_answer' }
    : { ms: RINGING_MS, since: row.started_at, why: 'missed' };

const LIMITS = new Map<CallRow['status'], (row: CallRow) => Limit>([
  ['connecting', ringLimit],
  ['ringing', ringLimit],
  ['accepting', (row) => ({ ms: ACCEPTING_MS, since: row.updated_at, why: 'failed' })],
  ['active', (row) => ({ ms: ACTIVE_MS, since: row.answered_at ?? row.started_at, why: 'hangup' })],
]);

function limitOf(row: CallRow): Limit | null {
  return LIMITS.get(row.status)?.(row) ?? null;
}

/** Why a live row is overdue at `now`, or null while it may still go on. */
export function overdue(row: CallRow, now: Date): Overdue | null {
  const limit = limitOf(row);
  return limit && now.getTime() - Date.parse(limit.since) > limit.ms ? limit.why : null;
}

/**
 * The unanswered timeout (docs/28 §3.1) and the safety net for lost webhooks. Sweeps whatever the
 * setting says while a call is (or may be) live, so a call left live when calls were switched off
 * still ends. Idle (the last sweep left none live, no wake since): nothing at all while calls are
 * OFF (as one process did before), one sweep per IDLE_MS while ON (the backstop for a lost wake).
 * Inserts run on the API copies and this runs on the worker (docs/09), so an insert calls wake(),
 * which the API copy forwards to the worker. Idempotent: every end is compare-and-set, so two
 * sweeps together end a row once (a second terminate is a no-op).
 */
@BackgroundJob({ name: 'calls-sweeper', kick: 'wake' })
@Injectable()
export class CallsSweeper extends TickerJob {
  private readonly log = new Logger(CallsSweeper.name);
  protected readonly ticker = new Ticker({
    name: CallsSweeper.name,
    firstMs: EVERY_MS,
    everyMs: EVERY_MS,
    run: () => this.tick(),
  });
  /** Rows the last sweep left live; null = unknown (boot, or the sweep failed): sweep. */
  private left: number | null = null;
  private sweptAt = 0;
  /** wake() calls so far: a wake during a sweep outranks that sweep's (older) count. */
  private wakes = 0;

  /** gate absent (unit tests): calls count as ON. */
  constructor(
    private readonly kit: CallsKit,
    @Optional() private readonly gate?: CallsGate,
  ) {
    super();
  }

  /** A call was inserted: sweep from the next tick (its 45 s timeout cannot wait for idle). */
  wake(): Promise<void> {
    this.wakes += 1;
    this.left = null;
    return Promise.resolve();
  }

  /** The 10 s tick: a sweep only when one may end something (idle rules above). Never throws. */
  async tick(now: Date = new Date()): Promise<number> {
    return (await this.due(now)) ? this.runOnce(now) : 0;
  }

  private async due(now: Date): Promise<boolean> {
    if (this.left !== 0) return true;
    if (now.getTime() - this.sweptAt < IDLE_MS) return false;
    // An unreadable setting sweeps: the safety net never stops on an error.
    const on = this.gate ? await this.gate.enabled().catch(() => true) : true;
    // OFF: the next look at the setting waits a whole IDLE_MS too (a wake still sweeps at once).
    if (!on) this.sweptAt = now.getTime();
    return on;
  }

  /** One sweep now. Never throws; the number of calls ended. */
  async runOnce(now: Date = new Date()): Promise<number> {
    let ended = 0;
    const wakes = this.wakes;
    try {
      const rows = await this.kit.queries.live();
      for (const row of rows) ended += await this.endIfOverdue(row, now);
      this.left = this.wakes === wakes ? rows.length - ended : null;
    } catch (e) {
      this.left = null;
      this.log.error(`calls sweep failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.sweptAt = now.getTime();
    return ended;
  }

  private async endIfOverdue(row: CallRow, now: Date): Promise<number> {
    const why = overdue(row, now);
    if (!why) return 0;
    if (why !== 'missed') await this.terminate(row);
    const reason = why === 'hangup' ? undefined : why;
    const moved = await this.kit.apply(row, { type: 'hangup', at: now.toISOString(), ...(reason ? { reason } : {}) });
    return moved ? 1 : 0;
  }

  private async terminate(row: CallRow): Promise<void> {
    const line = callingLine();
    if (line && row.wa_call_id) {
      await this.kit.api.terminate(line, row.wa_call_id).catch((e: unknown) => logCallError(this.log, { what: 'timeout terminate', callId: row.id, error: e }));
    }
  }
}
