import { z } from 'zod';
import {
  SHORT_LINK_AUDIENCES,
  SHORT_LINK_SEND_STATUSES,
  SHORT_LINK_STATUSES,
} from './short-links';

// What the short-link routes answer (docs/19 «Short links»), as zod schemas the clients parse.

const iso = z.string();
const person = z.object({ id: z.uuid(), name: z.string(), role: z.string() });

export const shortLinkRowSchema = z.object({
  code: z.string(),
  title: z.string(),
  shortUrl: z.string(),
  targetUrl: z.string(),
  status: z.enum(SHORT_LINK_STATUSES),
  audience: z.enum(SHORT_LINK_AUDIENCES),
  maxUsers: z.number().nullable(),
  sendWhatsapp: z.boolean(),
  expiresAt: iso,
  createdAt: iso,
  createdBy: person.nullable(),
  users: z.number(),
  visitors: z.number(),
});
export type ShortLinkRow = z.infer<typeof shortLinkRowSchema>;

export const shortLinkPageSchema = z.object({
  rows: z.array(shortLinkRowSchema),
  total: z.number(),
});
export type ShortLinkPage = z.infer<typeof shortLinkPageSchema>;

export const shortLinkUserSchema = z.object({
  id: z.uuid(),
  person: person.nullable(),
  phone: z.string().nullable(),
  sendStatus: z.enum(SHORT_LINK_SEND_STATUSES),
  sendError: z.string().nullable(),
  sentAt: iso.nullable(),
});
export type ShortLinkUser = z.infer<typeof shortLinkUserSchema>;

/** A visitor: a system user (person) or a verified phone (+ the matched person when known). */
export const shortLinkVisitorSchema = z.object({
  kind: z.enum(['user', 'phone']),
  person: person.nullable(),
  phone: z.string().nullable(),
  family: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  firstAt: iso,
  lastAt: iso,
  opens: z.number(),
});
export type ShortLinkVisitor = z.infer<typeof shortLinkVisitorSchema>;

export const shortLinkDetailSchema = shortLinkRowSchema.extend({
  userList: z.array(shortLinkUserSchema),
  visitorList: z.array(shortLinkVisitorSchema),
});
export type ShortLinkDetail = z.infer<typeof shortLinkDetailSchema>;

/** POST /short-links and …/resend: the detail and, when a WhatsApp send ran, its counts. */
export const shortLinkSentDetailSchema = shortLinkDetailSchema.extend({
  send: z.object({ queued: z.number(), failed: z.number() }).nullable(),
});
export type ShortLinkSentDetail = z.infer<typeof shortLinkSentDetailSchema>;

export const shortLinkPersonSchema = person.extend({ phone: z.string().nullable() });
export type ShortLinkPerson = z.infer<typeof shortLinkPersonSchema>;

/** GET /public/short-links/:code: never the target. */
export const shortLinkGateViewSchema = z.object({
  title: z.string().nullable(),
  state: z.enum(['open', 'gone']),
  /** Why a gone link is gone (the gate shows expired or revoked); null while open. */
  goneReason: z.enum(['expired', 'revoked']).nullable(),
  /** A managed link always needs a signed-in user or a phone verified by a WhatsApp code. */
  needs: z.literal('sign_in_or_code'),
  codesAvailable: z.boolean(),
});
export type ShortLinkGateView = z.infer<typeof shortLinkGateViewSchema>;

export const SHORT_LINK_OUTCOMES = ['open', 'gone', 'not_allowed', 'limit_reached'] as const;
export const shortLinkOutcomeSchema = z.enum(SHORT_LINK_OUTCOMES);
export type ShortLinkOutcome = z.infer<typeof shortLinkOutcomeSchema>;

/** POST …/open and …/otp/verify: the target only with outcome open. */
export const shortLinkOpenResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('open'), target: z.string() }),
  z.object({ outcome: z.enum(['gone', 'not_allowed', 'limit_reached']) }),
]);
export type ShortLinkOpenResult = z.infer<typeof shortLinkOpenResultSchema>;
