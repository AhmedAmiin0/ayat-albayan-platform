import { nextCall, type CallEvent, type CallStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ThreadsQueries } from '../../inbox/threads/threads.queries';
import { CALLS_API, type CallsApi } from '../kapso/calls-api';
import { callState, type CallMove, type CallRow } from '../store/call-row';
import { CallsQueries } from '../store/calls.queries';

/** Concurrent webhook items on one call: each re-read judges the event again, a few times at most. */
const MAX_ATTEMPTS = 4;

/** Extra columns a move may write beside the machine's patch (who took it, why it failed). */
type MoveExtra = Pick<CallMove['patch'], 'accepted_by' | 'error_code'>;

/**
 * What every call flow needs: the store, the Kapso calls API, the chats (v_threads: who a phone is)
 * and the one way to move a row (the shared state machine, written compare-and-set).
 */
@Injectable()
export class CallsKit {
  constructor(
    readonly queries: CallsQueries,
    @Inject(CALLS_API) readonly api: CallsApi,
    readonly threads: ThreadsQueries,
  ) {}

  /**
   * The row after `event`, or null when the machine ignores it (duplicate, late, wrong side). A
   * concurrent writer that moved the row first means a re-read and the event is judged again (MAX_ATTEMPTS).
   */
  async apply(row: CallRow, event: CallEvent, extra: MoveExtra = {}): Promise<CallRow | null> {
    let current: CallRow | null = row;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && current; attempt += 1) {
      const patch = nextCall(callState(current), event);
      if (!patch) return null;
      const moved = await this.queries.move({ id: current.id, from: current.status as CallStatus, patch: { ...patch, ...extra } });
      if (moved) return moved;
      current = await this.queries.get(current.id);
    }
    return null;
  }

  /** The row's names (v_threads display name) for its view. */
  names(rows: readonly CallRow[]): Promise<Map<string, string>> {
    return this.queries.names(rows.map((r) => r.phone_e164));
  }
}
