import type { CallingLine } from './calling-line';

/** Kapso's call_permissions answer, reduced to what the routes decide on (docs/28 §4). */
export interface CallPermissionFacts {
  /** start_call.can_perform_action: a call may start now. */
  canCall: boolean;
  /** send_call_permission_request.can_perform_action: WhatsApp would take a new request now. */
  canRequest: boolean;
  /** permission.expiration_time as UTC ISO; null = none given. */
  expiresAt: string | null;
}

/**
 * A call permission request from the calls number (docs/28 §10): the interactive (24 h window) or
 * the approved template.
 */
export type PermissionRequest =
  { to: string; text: string } | { to: string; template: { name: string; language: string } };

/**
 * The calling signaling over Kapso's Meta proxy (POST /{phone_number_id}/calls, GET
 * /{phone_number_id}/call_permissions). Every method makes exactly ONE request and never retries: a
 * connect whose answer was lost may already ring (and be billed), so the caller marks the call
 * failed instead. Errors are WaError (graph.ts), `uncertain` when the request may have arrived.
 */
export interface CallsApi {
  permission(line: CallingLine, to: string): Promise<CallPermissionFacts>;
  /** action connect with our SDP offer; `ref` = our wa_calls.id (biz_opaque_callback_data). */
  connect(line: CallingLine, input: { to: string; sdp: string; ref: string }): Promise<{ waCallId: string }>;
  /** pre_accept then accept, with the answering device's SDP answer. */
  accept(line: CallingLine, input: { waCallId: string; sdp: string; ref: string }): Promise<void>;
  reject(line: CallingLine, waCallId: string): Promise<void>;
  terminate(line: CallingLine, waCallId: string): Promise<void>;
  /**
   * POST /{phone_number_id}/messages from the calls number: only «اطلب إذن الاتصال», one request,
   * never retried.
   */
  requestPermission(line: CallingLine, input: PermissionRequest): Promise<{ waMessageId: string }>;
}

export const CALLS_API = Symbol('CALLS_API');
