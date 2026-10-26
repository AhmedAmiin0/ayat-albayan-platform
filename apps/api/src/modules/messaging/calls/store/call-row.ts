import type { Tables, TablesInsert } from '@ab/db';
import type { CallDirection, CallEndReason, CallPatch, CallState, CallStatus } from '@ab/shared';

/** One wa_calls row (migration 20261026000740). The text checks hold the shared enums. */
export type CallRow = Tables<'wa_calls'>;
export type NewCall = TablesInsert<'wa_calls'>;

/** The machine's view of a row (call-machine.ts); the checks guarantee the casts. */
export function callState(row: CallRow): CallState {
  return {
    status: row.status as CallStatus,
    direction: row.direction as CallDirection,
    answered_at: row.answered_at,
    answer_sdp: row.answer_sdp,
    end_reason: row.end_reason as CallEndReason | null,
    duration_seconds: row.duration_seconds,
  };
}

/** A compare-and-set write: applied only while the row still has `from` as its status. */
export interface CallMove {
  id: string;
  from: CallStatus;
  patch: CallPatch & { wa_call_id?: string; accepted_by?: string; error_code?: string };
}
