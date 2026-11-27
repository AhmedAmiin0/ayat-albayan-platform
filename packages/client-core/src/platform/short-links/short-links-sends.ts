import {
  shortLinkGateRoutes,
  shortLinkRoutes as routes,
  type ShortLinkCreate,
  type ShortLinkDetail,
  type ShortLinkOpenResult,
  type ShortLinkSentDetail,
  type ShortLinkUpdate,
} from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

// Each write takes a single input, ready for a TanStack `mutationFn` (docs/19).

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

export function shortLinkSends(client: ApiClient): ShortLinkSends {
  const call = callWith(client);
  return {
    create: (body) => call({ route: routes.create, body }),
    update: ({ code, body }) => call({ route: routes.update, params: { code }, body }),
    revoke: (code) => call({ route: routes.revoke, params: { code } }),
    resend: (code) => call({ route: routes.resend, params: { code } }),
    open: (code) => call({ route: shortLinkGateRoutes.open, params: { code } }),
    otpStart: ({ code, phone }) =>
      call({ route: shortLinkGateRoutes.start, params: { code }, body: { phone } }),
    otpVerify: ({ code, phone, otp }) =>
      call({ route: shortLinkGateRoutes.verify, params: { code }, body: { phone, code: otp } }),
  };
}
