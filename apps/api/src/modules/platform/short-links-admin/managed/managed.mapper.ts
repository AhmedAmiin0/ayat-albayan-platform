import {
  SHORT_LINK_AUDIENCES,
  SHORT_LINK_SEND_STATUSES,
  SHORT_LINK_STATUSES,
  type ShortLinkRow as ShortLinkView,
  type ShortLinkUser,
  type ShortLinkVisitor,
} from '@ab/shared';
import { z } from 'zod';
import type { PersonRow } from '@/modules/platform/short-links-admin/people';
import type { ShortLinkRow } from '@/modules/platform/short-links';
import type { LinkUserRow, LinkVisitRow } from './link-users.repo';

interface Person {
  id: string;
  name: string;
  role: string;
}
export type People = Map<string, PersonRow>;

/** The stored enums, read with their schema (a value the checks never let in reads safely). */
const status = z.enum(SHORT_LINK_STATUSES).catch('expired');
const audience = z.enum(SHORT_LINK_AUDIENCES).catch('listed');
const sendStatus = z.enum(SHORT_LINK_SEND_STATUSES).catch('failed');

export const personOf = (people: People, id: string | null): Person | null => {
  const p = id ? people.get(id) : undefined;
  return p ? { id: p.id, name: p.full_name, role: p.role } : null;
};

export interface RowParts {
  row: ShortLinkRow;
  base: string;
  people: People;
  counts: { users: number; visitors: number };
}

/** One managed link as the admin list shows it. */
export function toLinkView({ row, base, people, counts }: RowParts): ShortLinkView {
  return {
    code: row.code,
    title: row.title ?? '',
    shortUrl: `${base}${row.code}`,
    targetUrl: row.target_url,
    status: status.parse(row.status),
    audience: audience.parse(row.audience),
    maxUsers: row.max_users,
    sendWhatsapp: row.send_whatsapp,
    expiresAt: row.expires_at ?? row.created_at,
    createdAt: row.created_at,
    createdBy: personOf(people, row.created_by),
    users: counts.users,
    visitors: counts.visitors,
  };
}

export function toUserView(row: LinkUserRow, people: People): ShortLinkUser {
  return {
    id: row.id,
    person: personOf(people, row.profile_id),
    phone: row.phone_e164,
    sendStatus: sendStatus.parse(row.send_status),
    sendError: row.send_error,
    sentAt: row.sent_at,
  };
}

/** A system user by profile, or a verified phone with the person and family it matched. */
export function toVisitorView(
  row: LinkVisitRow,
  known: { people: People; families: Map<string, string> },
): ShortLinkVisitor {
  const family = row.matched_guardian_id;
  const familyName = family ? known.families.get(family) : undefined;
  return {
    kind: row.profile_id ? 'user' : 'phone',
    person: personOf(known.people, row.profile_id ?? row.matched_profile_id),
    phone: row.phone_e164,
    family: family && familyName ? { id: family, name: familyName } : null,
    firstAt: row.first_at,
    lastAt: row.last_at,
    opens: row.opens,
  };
}
