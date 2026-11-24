import { shortLinkCreateSchema, type ShortLinkAudience, type ShortLinkCreate } from '@ab/shared';
import { asciiDigits } from '@ab/core';
import { SETTING_DEFAULTS } from '@ab/settings';
import { addDaysIn } from '@ab/time';
import { issueErrors, type LinkFieldErrors } from './link-form-errors.js';

// The form is checked by the API's own schema so the form and the server never disagree.

/** A person picked from GET /short-links/people. */
export interface LinkPick {
  id: string;
  name: string;
  role: string;
}

/** A custom expiry date is an ISO instant. */
export type LinkExpiry = { kind: 'days'; days: number } | { kind: 'date'; at: string };

export interface LinkForm {
  title: string;
  targetUrl: string;
  audience: ShortLinkAudience;
  people: LinkPick[];
  /** Numbers that are not on the platform, E.164 (checkPhone's `e164`). */
  phones: string[];
  /** Digits as typed; empty means no limit. */
  maxUsers: string;
  expiry: LinkExpiry;
  sendWhatsapp: boolean;
}

/** The lifetime chips of the boards. */
export const EXPIRY_DAY_CHOICES = [1, 3, 7, 30] as const;

/** Seeded default (7); sales cannot read settings and the API uses the stored value if absent. */
export const SHORT_LINK_DEFAULT_DAYS = SETTING_DEFAULTS.short_link_default_days;

export function emptyLinkForm(defaultDays: number): LinkForm {
  return {
    title: '',
    targetUrl: '',
    audience: 'anyone',
    people: [],
    phones: [],
    maxUsers: '',
    expiry: { kind: 'days', days: defaultDays },
    sendWhatsapp: false,
  };
}

export interface LinkClock {
  now: Date;
  /** The creator's zone keeps the wall clock across a DST change. */
  tz: string;
}

/** An ISO instant, or '' for a date that does not parse (the schema then flags it). */
const isoOrEmpty = (at: number): string => (Number.isNaN(at) ? '' : new Date(at).toISOString());

/** The expiry instant (ISO, UTC) the form means. */
export function expiresAtOf(expiry: LinkExpiry, clock: LinkClock): string {
  return expiry.kind === 'days'
    ? addDaysIn(clock.now, expiry.days, clock.tz).toISOString()
    : isoOrEmpty(Date.parse(expiry.at));
}

const isFutureInstant = (at: string, now: Date): boolean => Date.parse(at) > now.getTime();

/** Null means no limit; otherwise a whole number whose range the schema judges. */
export function maxUsersOf(typed: string): number | null {
  const digits = asciiDigits(typed).trim();
  return digits === '' ? null : Number(digits);
}

/** Everyone the link lists: picked people and typed numbers. */
export const listedCount = (form: LinkForm): number => form.people.length + form.phones.length;

const bodyOf = (form: LinkForm, expiresAt: string): unknown => ({
  title: form.title,
  targetUrl: form.targetUrl.trim(),
  expiresAt,
  maxUsers: maxUsersOf(form.maxUsers),
  audience: form.audience,
  profileIds: form.people.map((p) => p.id),
  phones: form.phones,
  sendWhatsapp: form.sendWhatsapp,
});

export type LinkFormCheck = { body: ShortLinkCreate } | { errors: LinkFieldErrors };

/** The POST /short-links body, or each field's shortLinks.form.errors key. */
export function toCreateBody(form: LinkForm, clock: LinkClock): LinkFormCheck {
  const expiresAt = expiresAtOf(form.expiry, clock);
  const parsed = shortLinkCreateSchema.safeParse(bodyOf(form, expiresAt));
  const errors: LinkFieldErrors = parsed.success ? {} : issueErrors(parsed.error.issues);
  const past = isFutureInstant(expiresAt, clock.now) ? {} : { expiresAt: 'expiry_past' as const };
  const all: LinkFieldErrors = { ...past, ...errors };
  return parsed.success && Object.keys(all).length === 0 ? { body: parsed.data } : { errors: all };
}

/** Adds a pick once (a second tap on the same person changes nothing). */
export const withPerson = (people: LinkPick[], pick: LinkPick): LinkPick[] =>
  people.some((p) => p.id === pick.id) ? people : [...people, pick];

export const withoutPerson = (people: LinkPick[], id: string): LinkPick[] =>
  people.filter((p) => p.id !== id);

/** Adds an E.164 number once. */
export const withPhone = (phones: string[], e164: string): string[] =>
  phones.includes(e164) ? phones : [...phones, e164];

export const withoutPhone = (phones: string[], e164: string): string[] =>
  phones.filter((p) => p !== e164);
