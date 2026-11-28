import type { ShortLinkGateView, ShortLinkOpenResult } from '@ab/shared';
import type { ShortLinkQuery } from './short-links-api.types';

/** The gate's view, or the one 404 an unknown, system or malformed code answers. */
export type GateViewResult =
  | { kind: 'view'; view: ShortLinkGateView }
  | { kind: 'not_found' };

export interface GatePhoneCall {
  code: string;
  /** E.164 (checkPhone's `e164`). */
  phone: string;
}

export interface GateVerifyCall extends GatePhoneCall {
  /** The six digits from WhatsApp. */
  otp: string;
}

/** The public gate /l/<code> (docs/19): anyone holding the link, signed in or not. */
export interface ShortLinkGateCalls {
  /** A 404 resolves as `not_found` instead of throwing. */
  viewQuery: (code: string) => ShortLinkQuery<GateViewResult>;
  /** The signed-in open (the session's JWT). */
  open: (code: string) => Promise<ShortLinkOpenResult>;
  /** Always 202: a code goes out only while the link is live (and to a listed phone). */
  otpStart: (call: GatePhoneCall) => Promise<void>;
  /** 401 invalid_code; else the outcome for the verified phone. */
  otpVerify: (call: GateVerifyCall) => Promise<ShortLinkOpenResult>;
}
