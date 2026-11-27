import { id, instant, phoneE164 } from '@ab/core';
import { z } from 'zod';

// WhatsApp voice calls (docs/28): one wa_calls row per call; times are UTC instants (rule 6).

/** Who started the call: staff from the chat (outbound) or the family from WhatsApp (inbound). */
export const CALL_DIRECTIONS = ['outbound', 'inbound'] as const;
export const callDirectionSchema = z.enum(CALL_DIRECTIONS);
export type CallDirection = z.infer<typeof callDirectionSchema>;

/**
 * connecting = our row exists, the SDP offer went (or is going) to WhatsApp; ringing = the family's
 * phone rings (outbound) or ours does (inbound); accepting = one staff member took an inbound call
 * and its pre_accept / accept are in flight; active = talking; ended = final (end_reason says how).
 */
export const CALL_STATUSES = ['connecting', 'ringing', 'accepting', 'active', 'ended'] as const;
export const callStatusSchema = z.enum(CALL_STATUSES);
export type CallStatus = z.infer<typeof callStatusSchema>;

/**
 * completed = answered, then hung up; no_answer = outbound never answered (incl. our 45 s timeout);
 * rejected = the family declined; cancelled = staff hung up before an answer; missed = an inbound
 * call nobody took; declined = staff declined an inbound call; failed = WhatsApp refused or the
 * request's answer was lost (never retried: it may already be billed).
 */
export const CALL_END_REASONS = [
  'completed',
  'no_answer',
  'rejected',
  'cancelled',
  'missed',
  'declined',
  'failed',
] as const;
export const callEndReasonSchema = z.enum(CALL_END_REASONS);
export type CallEndReason = z.infer<typeof callEndReasonSchema>;

/** A call as the clients see it (GET /calls); never an SDP, a request id or an error payload. */
export const callViewSchema = z.object({
  id: id(),
  phone_e164: phoneE164,
  direction: callDirectionSchema,
  status: callStatusSchema,
  end_reason: callEndReasonSchema.nullable(),
  /** Who the number is (guardian or lead name), as in the thread; null = unknown. */
  display_name: z.string().nullable(),
  /** The staff member who placed (outbound) or took (inbound) it; null while nobody has. */
  staff_id: id().nullable(),
  started_at: instant,
  answered_at: instant.nullable(),
  ended_at: instant.nullable(),
  duration_seconds: z.number().int().min(0).nullable(),
});
export type CallView = z.infer<typeof callViewSchema>;

/** /calls/active and the call actions: the SDPs the caller's or the answerer's device needs. */
export const activeCallViewSchema = callViewSchema.extend({
  /** Inbound: the family's offer (to answer); outbound: null. */
  offer_sdp: z.string().nullable(),
  /** Outbound: WhatsApp's answer, once the connect webhook came; inbound: null. */
  answer_sdp: z.string().nullable(),
});
export type ActiveCallView = z.infer<typeof activeCallViewSchema>;

/** One ICE server for RTCPeerConnection (STUN, and TURN when the academy set one). */
export const callIceServerSchema = z.object({
  urls: z.array(z.string().min(1)),
  username: z.string().optional(),
  credential: z.string().optional(),
});
export type CallIceServer = z.infer<typeof callIceServerSchema>;

/** GET /calls/config: whether the phone icon shows at all, and the ICE servers when it does. */
export const callConfigViewSchema = z.object({
  /** whatsapp_calls_enabled (default false). false = every call route answers 404. */
  enabled: z.boolean(),
  /** The chat line is on the Kapso driver and configured; false = the icon shows why not. */
  available: z.boolean(),
  /** May this user call from the chat (inbox.send)? */
  canCall: z.boolean(),
  iceServers: z.array(callIceServerSchema),
});
export type CallConfigView = z.infer<typeof callConfigViewSchema>;

/** needs_template: outside the 24 h window; limited: WhatsApp's own limits refuse for now. */
export const CALL_PERMISSION_STATES = ['granted', 'request', 'needs_template', 'limited'] as const;
export const callPermissionStateSchema = z.enum(CALL_PERMISSION_STATES);
export type CallPermissionState = z.infer<typeof callPermissionStateSchema>;

/** Asked from a calls number (docs/28 §10): in its 24 h window, or by template. */
export const callPermissionViaSchema = z.enum(['interactive', 'template']);
export type CallPermissionVia = z.infer<typeof callPermissionViaSchema>;

/** The family's last answer to a request from the calling number (call_permission_reply). */
export const callPermissionReplySchema = z.object({
  response: z.enum(['accepted', 'rejected']),
  at: instant,
  /** accepted: when the grant lapses; null = permanent or unknown. */
  expires_at: instant.nullable(),
});
export type CallPermissionReply = z.infer<typeof callPermissionReplySchema>;

export const callPermissionViewSchema = z.object({
  state: callPermissionStateSchema,
  /** granted: when WhatsApp says the permission lapses; null = permanent or unknown. */
  expires_at: instant.nullable(),
  /** Calls number (docs/28 §10): how permission is asked; absent means the chat line. */
  via: callPermissionViaSchema.optional(),
  /** A calls number only: the family's stored last answer on it; absent / null = none. */
  reply: callPermissionReplySchema.nullable().optional(),
});
export type CallPermissionView = z.infer<typeof callPermissionViewSchema>;
