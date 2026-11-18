import { shortLinkUpdateSchema, type ShortLinkRow, type ShortLinkUpdate } from '@ab/shared';
import { issueErrors, type LinkFieldErrors } from '../link-form-errors.js';
import { expiresAtOf, maxUsersOf, type LinkClock, type LinkExpiry } from '../link-form.js';

// «تعديل» / «تمديد» of a link (boards LinkXWebDetail, LinkXStaffDetail): the title, the allowed
// users and a new lifetime, as the PATCH /short-links/:code body (a new expiry reactivates an
// expired link, docs/19), checked by the API's own schema.

export interface LinkEdit {
  title: string;
  /** Digits as typed; empty = «بلا حد». */
  maxUsers: string;
  /** null keeps the expiry; a choice moves it from now. */
  expiry: LinkExpiry | null;
}

export const editOf = (link: Pick<ShortLinkRow, 'title' | 'maxUsers'>): LinkEdit => ({
  title: link.title,
  maxUsers: link.maxUsers === null ? '' : String(link.maxUsers),
  expiry: null,
});

export type LinkEditCheck = { body: ShortLinkUpdate } | { errors: LinkFieldErrors };

const expiryOf = (edit: LinkEdit, clock: LinkClock): { expiresAt?: string } =>
  edit.expiry === null ? {} : { expiresAt: expiresAtOf(edit.expiry, clock) };

const isPast = (at: string | undefined, now: Date): boolean =>
  at !== undefined && !(Date.parse(at) > now.getTime());

/** The PATCH body, or each field's shortLinks.form.errors key. */
export function toUpdateBody(edit: LinkEdit, clock: LinkClock): LinkEditCheck {
  const expiry = expiryOf(edit, clock);
  const body = { title: edit.title, maxUsers: maxUsersOf(edit.maxUsers), ...expiry };
  const parsed = shortLinkUpdateSchema.safeParse(body);
  const errors: LinkFieldErrors = parsed.success ? {} : issueErrors(parsed.error.issues);
  const past = isPast(expiry.expiresAt, clock.now) ? { expiresAt: 'expiry_past' as const } : {};
  const all: LinkFieldErrors = { ...past, ...errors };
  return parsed.success && Object.keys(all).length === 0 ? { body: parsed.data } : { errors: all };
}
