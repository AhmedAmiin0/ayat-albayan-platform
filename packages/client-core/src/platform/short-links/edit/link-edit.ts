import { shortLinkUpdateSchema, type ShortLinkDetail, type ShortLinkUpdate } from '@ab/shared';
import {
  expiresAtOf,
  maxUsersOf,
  type LinkClock,
  type LinkExpiry,
  type LinkPick,
} from '../link-form.js';
import { issueErrors, type LinkFieldErrors } from '../link-form-errors.js';

// A field left out stays as is on the server; a given user list replaces the old one.

export interface LinkEdit {
  title?: string;
  /** Digits as typed; empty means no limit. */
  maxUsers?: string;
  people?: LinkPick[];
  phones?: string[];
  /** A new expiry (an expired link runs again until it). */
  expiry?: LinkExpiry;
}

/** The edit form of a link as it is: its title, limit and listed users (no expiry change). */
export function editOf(link: ShortLinkDetail): Required<Omit<LinkEdit, 'expiry'>> {
  const people = link.userList.flatMap((u) => (u.person ? [u.person] : []));
  const phones = link.userList.flatMap((u) => (u.person === null && u.phone ? [u.phone] : []));
  return {
    title: link.title,
    maxUsers: link.maxUsers === null ? '' : String(link.maxUsers),
    people: people.map(({ id, name, role }) => ({ id, name, role })),
    phones,
  };
}

const usersOf = (edit: LinkEdit): object => ({
  ...(edit.people ? { profileIds: edit.people.map((p) => p.id) } : {}),
  ...(edit.phones ? { phones: edit.phones } : {}),
});

const bodyOf = (edit: LinkEdit, expiresAt: string | null): object => ({
  ...(edit.title === undefined ? {} : { title: edit.title }),
  ...(edit.maxUsers === undefined ? {} : { maxUsers: maxUsersOf(edit.maxUsers) }),
  ...(expiresAt === null ? {} : { expiresAt }),
  ...usersOf(edit),
});

const isPast = (at: string | null, now: Date): boolean =>
  at !== null && !(Date.parse(at) > now.getTime());

export type LinkEditCheck = { body: ShortLinkUpdate } | { errors: LinkFieldErrors };

/** The PATCH /short-links/:code body, or each field's shortLinks.form.errors key. */
export function toUpdateBody(edit: LinkEdit, clock: LinkClock): LinkEditCheck {
  const expiresAt = edit.expiry ? expiresAtOf(edit.expiry, clock) : null;
  const parsed = shortLinkUpdateSchema.safeParse(bodyOf(edit, expiresAt));
  const errors: LinkFieldErrors = parsed.success ? {} : issueErrors(parsed.error.issues);
  const past = isPast(expiresAt, clock.now) ? { expiresAt: 'expiry_past' as const } : {};
  const all: LinkFieldErrors = { ...past, ...errors };
  return parsed.success && Object.keys(all).length === 0 ? { body: parsed.data } : { errors: all };
}
