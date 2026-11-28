import type {
  ShortLinkCreate,
  ShortLinkDetail,
  ShortLinkSentDetail,
  ShortLinkUpdate,
} from '@ab/shared';

export interface ShortLinkUpdateCall {
  code: string;
  body: ShortLinkUpdate;
}

export interface ShortLinkSends {
  /** POST /short-links: the new link and, with sendWhatsapp, the send counts. */
  create: (body: ShortLinkCreate) => Promise<ShortLinkSentDetail>;
  /** PATCH /short-links/:code: a given user list replaces the old one. */
  update: (call: ShortLinkUpdateCall) => Promise<ShortLinkDetail>;
  revoke: (code: string) => Promise<ShortLinkDetail>;
  /** WhatsApp again to the listed users. */
  resend: (code: string) => Promise<ShortLinkSentDetail>;
}
