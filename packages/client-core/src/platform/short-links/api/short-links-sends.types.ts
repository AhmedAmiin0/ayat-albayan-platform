import type {
  ShortLinkCreate,
  ShortLinkDetail,
  ShortLinkOpenResult,
  ShortLinkSentDetail,
  ShortLinkUpdate,
} from '@ab/shared';

export interface ShortLinkUpdateCall {
  code: string;
  body: ShortLinkUpdate;
}

export interface GatePhoneCall {
  code: string;
  /** E.164 (checkPhone's `e164`). */
  phone: string;
}

export interface GateVerifyCall extends GatePhoneCall {
  /** The six digits from WhatsApp. */
  otp: string;
}

export interface ShortLinkSends {
  /** POST /short-links: the new link and, with sendWhatsapp, the send counts. */
  create: (body: ShortLinkCreate) => Promise<ShortLinkSentDetail>;
  /** PATCH /short-links/:code: a given user list replaces the old one. */
  update: (call: ShortLinkUpdateCall) => Promise<ShortLinkDetail>;
  revoke: (code: string) => Promise<ShortLinkDetail>;
  /** WhatsApp again to the listed users. */
  resend: (code: string) => Promise<ShortLinkSentDetail>;
  /** The gate's signed-in open (the session's JWT). */
  open: (code: string) => Promise<ShortLinkOpenResult>;
  /** Always 202: a code goes out only while the link is live (and to a listed phone). */
  otpStart: (call: GatePhoneCall) => Promise<void>;
  /** 401 invalid_code; else the outcome for the verified phone. */
  otpVerify: (call: GateVerifyCall) => Promise<ShortLinkOpenResult>;
}
