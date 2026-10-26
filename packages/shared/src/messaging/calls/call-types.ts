// WhatsApp voice calls from the academy chat number (docs/28): one wa_calls row per call. Times are
// UTC ISO strings (rule 6); the clients show them in the viewer's time zone.

/** Who started the call: staff from the chat (outbound) or the family from WhatsApp (inbound). */
export const CALL_DIRECTIONS = ['outbound', 'inbound'] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

/**
 * connecting = our row exists, the SDP offer went (or is going) to WhatsApp; ringing = the family's
 * phone rings (outbound) or ours does (inbound); accepting = one staff member took an inbound call and
 * its pre_accept / accept are in flight; active = talking; ended = final (end_reason says how).
 */
export const CALL_STATUSES = ['connecting', 'ringing', 'accepting', 'active', 'ended'] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/**
 * completed = it was answered and then hung up; no_answer = outbound never answered (incl. our 45 s
 * timeout); rejected = the family declined; cancelled = staff hung up before an answer; missed = an
 * inbound call nobody took; declined = staff declined an inbound call; failed = WhatsApp refused or
 * the request's answer was lost (never retried: it may already be billed).
 */
export const CALL_END_REASONS = ['completed', 'no_answer', 'rejected', 'cancelled', 'missed', 'declined', 'failed'] as const;
export type CallEndReason = (typeof CALL_END_REASONS)[number];

/** A call as the clients see it (GET /calls, /calls/active). SDPs only on /calls/active, to the parties. */
export interface CallView {
  id: string;
  phone_e164: string;
  direction: CallDirection;
  status: CallStatus;
  end_reason: CallEndReason | null;
  /** Who the number is (guardian or lead name), as in the thread; null = unknown. */
  display_name: string | null;
  /** The staff member who placed (outbound) or took (inbound) it; null while nobody has. */
  staff_id: string | null;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
}

/** /calls/active only: what the caller's or the answerer's browser needs for WebRTC. */
export interface ActiveCallView extends CallView {
  /** Inbound: the family's offer (to answer); outbound: null. */
  offer_sdp: string | null;
  /** Outbound: WhatsApp's answer, once the connect webhook came; inbound: null. */
  answer_sdp: string | null;
}

/** One ICE server for RTCPeerConnection (STUN, and TURN when the academy set one). */
export interface CallIceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

/** GET /calls/config: whether the phone icon shows at all, and the ICE servers when it does. */
export interface CallConfigView {
  /** whatsapp_calls_enabled (default false). false = every call route answers 404. */
  enabled: boolean;
  /** The chat line is on the Kapso driver and configured; false = the icon shows why it cannot call. */
  available: boolean;
  /** May this user call from the chat (inbox.send)? */
  canCall: boolean;
  iceServers: CallIceServer[];
}

/**
 * GET /calls/permission/:phone (Kapso call_permissions): granted = the call may start; request =
 * inside the 24 h window, «اطلب إذن الاتصال» sends the interactive request; needs_template = outside
 * it, only an approved call-permission template could ask (owner step 4); limited = WhatsApp's own
 * limits refuse both the call and a new request for now (e.g. a request already sent today).
 */
export const CALL_PERMISSION_STATES = ['granted', 'request', 'needs_template', 'limited'] as const;
export type CallPermissionState = (typeof CALL_PERMISSION_STATES)[number];

export interface CallPermissionView {
  state: CallPermissionState;
  /** granted: when WhatsApp says the permission lapses (UTC); null = permanent or unknown. */
  expires_at: string | null;
}
