import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import type { CallEndReason } from '@ab/shared';
import { callingLine } from '../kapso/calling-line';
import type { CallRow } from '../store/call-row';
import { logCallError } from './call-errors';
import { CallsKit } from './call-kit';

/** An outbound call nobody answered within this is ended (and terminated on WhatsApp). */
export const UNANSWERED_MS = 45_000;
/** An inbound call still ringing this long (its terminate webhook lost) is a missed call. */
export const RINGING_MS = 60_000;
/** An accept that never completed. */
export const ACCEPTING_MS = 30_000;
/** A call still «active» this long lost its terminate webhook. */
export const ACTIVE_MS = 4 * 3_600_000;
const EVERY_MS = 10_000;

type Overdue = CallEndReason | 'hangup';

/**
 * How long a live row may stay as it is, from when it got there, and how it ends after that: rings from
 * started_at, an accept from its claim (updated_at, set by the claim's write), talk from answered_at.
 */
function limitOf(row: CallRow): { ms: number; since: string; why: Overdue } | null {
  if (row.status === 'connecting' || row.status === 'ringing') {
    const ring = row.direction === 'outbound' ? { ms: UNANSWERED_MS, why: 'no_answer' as const } : { ms: RINGING_MS, why: 'missed' as const };
    return { ...ring, since: row.started_at };
  }
  if (row.status === 'accepting') return { ms: ACCEPTING_MS, since: row.updated_at, why: 'failed' };
  return row.status === 'active' ? { ms: ACTIVE_MS, since: row.answered_at ?? row.started_at, why: 'hangup' } : null;
}

/** Why a live row is overdue at `now`, or null while it may still go on. */
export function overdue(row: CallRow, now: Date): Overdue | null {
  const limit = limitOf(row);
  return limit && now.getTime() - Date.parse(limit.since) > limit.ms ? limit.why : null;
}

/**
 * The unanswered timeout (docs/28 §3.1) and the safety net for lost webhooks. Runs whatever the
 * setting says, so a call left live when calls were switched off still ends. Idempotent: every end is
 * compare-and-set, so two API instances sweeping together end a row once (a second terminate is a no-op).
 */
@Injectable()
export class CallsSweeper implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(CallsSweeper.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly kit: CallsKit) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.runOnce(), EVERY_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Never throws; the number of calls ended. */
  async runOnce(now: Date = new Date()): Promise<number> {
    let ended = 0;
    try {
      for (const row of await this.kit.queries.live()) ended += await this.endIfOverdue(row, now);
    } catch (e) {
      this.log.error(`calls sweep failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return ended;
  }

  private async endIfOverdue(row: CallRow, now: Date): Promise<number> {
    const why = overdue(row, now);
    if (!why) return 0;
    const line = callingLine();
    if (why !== 'missed' && line && row.wa_call_id) {
      await this.kit.api.terminate(line, row.wa_call_id).catch((e: unknown) => logCallError(this.log, { what: 'timeout terminate', callId: row.id, error: e }));
    }
    const reason = why === 'hangup' ? undefined : why;
    const moved = await this.kit.apply(row, { type: 'hangup', at: now.toISOString(), ...(reason ? { reason } : {}) });
    return moved ? 1 : 0;
  }
}
