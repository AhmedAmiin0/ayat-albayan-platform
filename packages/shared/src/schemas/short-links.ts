import { z } from 'zod';
import { pageQuery, phoneE164 } from '@ab/core';
import { loginCode } from '../people/users';

// Managed short links (docs/19 «Short links»): the admin / sales bodies and the
// public gate's bodies, shared by the API (authoritative), the web and the mobile app.

export const SHORT_LINK_STATUSES = ['active', 'expired', 'revoked'] as const;
export type ShortLinkStatus = (typeof SHORT_LINK_STATUSES)[number];
export const SHORT_LINK_AUDIENCES = ['anyone', 'listed'] as const;
export type ShortLinkAudience = (typeof SHORT_LINK_AUDIENCES)[number];
export const SHORT_LINK_SEND_STATUSES = ['not_sent', 'queued', 'failed'] as const;
export type ShortLinkSendStatus = (typeof SHORT_LINK_SEND_STATUSES)[number];
/** The WhatsApp template every managed link goes out with (notifications line, docs/19). */
export const SHORT_LINK_TEMPLATE = 'short_link';
/** The web gate's path: <WEB_ORIGIN>/l/<code>. */
export const SHORT_LINK_GATE_PATH = '/l/';
export const SHORT_LINK_MAX_LISTED = 200;
export const SHORT_LINK_MAX_DAYS = 365;

/** A short code as the server makes it (base62); anything else is the same 404. */
export const shortCodeSchema = z.string().regex(/^[A-Za-z0-9]{8,32}$/, 'not_found');

const title = z.string().trim().min(1).max(120);
const targetUrl = z.url({ protocol: /^https$/ }).max(2048);
const maxUsers = z.number().int().min(1).max(10_000).nullable();
const profileIds = z.array(z.uuid()).max(SHORT_LINK_MAX_LISTED);
const phones = z.array(phoneE164).max(SHORT_LINK_MAX_LISTED);

const hasUsers = (v: { profileIds: string[]; phones: string[] }): boolean =>
  v.profileIds.length + v.phones.length > 0;
const needsUsers = (v: { audience: ShortLinkAudience; sendWhatsapp: boolean }): boolean =>
  v.audience === 'listed' || v.sendWhatsapp;

/** POST /short-links. expiresAt absent = now + short_link_default_days. */
export const shortLinkCreateSchema = z
  .object({
    title,
    targetUrl,
    expiresAt: z.iso.datetime({ offset: true }).optional(),
    maxUsers: maxUsers.default(null),
    audience: z.enum(SHORT_LINK_AUDIENCES).default('anyone'),
    profileIds: profileIds.default([]),
    phones: phones.default([]),
    sendWhatsapp: z.boolean().default(false),
  })
  .refine((v) => !needsUsers(v) || hasUsers(v), {
    message: 'users_required',
    path: ['profileIds'],
  });
export type ShortLinkCreate = z.infer<typeof shortLinkCreateSchema>;

/** PATCH /short-links/:code: a given user list replaces the old one. */
export const shortLinkUpdateSchema = z
  .object({
    title: title.optional(),
    expiresAt: z.iso.datetime({ offset: true }).optional(),
    maxUsers: maxUsers.optional(),
    profileIds: profileIds.optional(),
    phones: phones.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'empty_update' });
export type ShortLinkUpdate = z.infer<typeof shortLinkUpdateSchema>;

/** GET /short-links. owner: a creator's profile (short_links.all only). */
export const shortLinkListQuerySchema = z.object({
  status: z.enum(SHORT_LINK_STATUSES).optional(),
  owner: z.uuid().optional(),
  search: z.string().trim().min(1).max(80).optional(),
  ...pageQuery({ size: 20, lastPage: 10_000 }),
});
export type ShortLinkListQuery = z.infer<typeof shortLinkListQuerySchema>;

/** GET /short-links/people: the picker's search (name or phone digits). */
export const shortLinkPeopleQuerySchema = z.object({ search: z.string().trim().min(2).max(80) });
export type ShortLinkPeopleQuery = z.infer<typeof shortLinkPeopleQuerySchema>;

/** POST /public/short-links/:code/otp/start: any country's number. */
export const shortLinkOtpStartSchema = z.object({ phone: phoneE164 });
export type ShortLinkOtpStart = z.infer<typeof shortLinkOtpStartSchema>;
export const shortLinkOtpVerifySchema = z.object({ phone: phoneE164, code: loginCode });
export type ShortLinkOtpVerify = z.infer<typeof shortLinkOtpVerifySchema>;
