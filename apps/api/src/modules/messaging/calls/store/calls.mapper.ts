import type { ActiveCallView, CallDirection, CallEndReason, CallStatus, CallView } from '@ab/shared';
import type { CallRow } from './call-row';

/** A row as the clients see it: never an SDP, a request id or an error payload (rule 9). */
export function toCallView(row: CallRow, names: ReadonlyMap<string, string>): CallView {
  return {
    id: row.id,
    phone_e164: row.phone_e164,
    direction: row.direction as CallDirection,
    status: row.status as CallStatus,
    end_reason: row.end_reason as CallEndReason | null,
    display_name: names.get(row.phone_e164) ?? null,
    staff_id: row.direction === 'outbound' ? row.created_by : row.accepted_by,
    started_at: row.started_at,
    answered_at: row.answered_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
  };
}

/**
 * A live call for the device that runs its WebRTC: the family's offer of a ringing inbound call, or
 * WhatsApp's answer to the caller's own outbound offer. Nobody else gets either SDP.
 */
export function toActiveView(row: CallRow, input: { names: ReadonlyMap<string, string>; userId: string }): ActiveCallView {
  const own = row.direction === 'outbound' ? row.created_by === input.userId : row.accepted_by === input.userId || row.status === 'ringing';
  return {
    ...toCallView(row, input.names),
    offer_sdp: own && row.direction === 'inbound' ? row.offer_sdp : null,
    answer_sdp: own && row.direction === 'outbound' ? row.answer_sdp : null,
  };
}
