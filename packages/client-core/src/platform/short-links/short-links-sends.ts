import {
  shortLinkDetailSchema,
  shortLinkOpenResultSchema,
  shortLinkSentDetailSchema,
  type ShortLinkCreate,
  type ShortLinkDetail,
  type ShortLinkOpenResult,
  type ShortLinkSentDetail,
  type ShortLinkUpdate,
} from '@ab/shared';
import type { ApiClient } from '../../core/http/index.js';
import { enc, SHORT_LINKS_PATH, SHORT_LINKS_PUBLIC_PATH } from './short-links-api.js';

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

const admin = (code: string, tail = ''): string => `${SHORT_LINKS_PATH}/${enc(code)}${tail}`;
const gate = (code: string, tail: string): string =>
  `${SHORT_LINKS_PUBLIC_PATH}/${enc(code)}${tail}`;

export function shortLinkSends(client: ApiClient): ShortLinkSends {
  const post = (path: string, body?: unknown): Promise<unknown> =>
    client.apiSend('POST', path, body);
  const detail = (r: unknown): ShortLinkDetail => shortLinkDetailSchema.parse(r);
  const sent = (r: unknown): ShortLinkSentDetail => shortLinkSentDetailSchema.parse(r);
  const outcome = (r: unknown): ShortLinkOpenResult => shortLinkOpenResultSchema.parse(r);
  return {
    create: (body) => post(SHORT_LINKS_PATH, body).then(sent),
    update: ({ code, body }) =>
      client.apiSend('PATCH', admin(code), body).then(detail),
    revoke: (code) => post(admin(code, '/revoke')).then(detail),
    resend: (code) => post(admin(code, '/resend')).then(sent),
    open: (code) => post(gate(code, '/open')).then(outcome),
    otpStart: ({ code, phone }) => client.apiSend('POST', gate(code, '/otp/start'), { phone }),
    otpVerify: ({ code, phone, otp }) =>
      post(gate(code, '/otp/verify'), { phone, code: otp }).then(outcome),
  };
}
