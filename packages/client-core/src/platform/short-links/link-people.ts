import {
  ACTIVITY_ROLES,
  type ActivityRole,
  type ShortLinkDetail,
  type ShortLinkUser,
  type ShortLinkVisitor,
} from '@ab/shared';

export type RoleKey = ActivityRole | 'unknown';

const ROLES = new Set<string>(ACTIVITY_ROLES);
const isRole = (role: string): role is ActivityRole => ROLES.has(role);

/** An unknown role maps to `unknown`. */
export const roleKey = (role: string): RoleKey => (isRole(role) ? role : 'unknown');

export interface PersonLook {
  /** The person's name, or null for a number not on the platform. */
  name: string | null;
  role: RoleKey | null;
  /** The number to show (E.164), when the row is a phone. */
  phone: string | null;
  matched: boolean;
  /** A phone with no person. */
  unregistered: boolean;
}

interface Who {
  person: { name: string; role: string } | null;
  phone: string | null;
}

function lookOf(who: Who, matched: boolean): PersonLook {
  const { person, phone } = who;
  return {
    name: person ? person.name : null,
    role: person ? roleKey(person.role) : null,
    phone,
    matched: matched && person !== null,
    unregistered: person === null,
  };
}

/** A listed user: a picked person (its phone stays hidden) or a typed number. */
export const userLook = (user: ShortLinkUser): PersonLook =>
  lookOf({ person: user.person, phone: user.person ? null : user.phone }, false);

/** shortLinks.visitors.via.<key>. */
export type VisitorVia = 'account' | 'whatsapp';

export interface VisitorLook extends PersonLook {
  via: VisitorVia;
  /** The family the verified phone belongs to, when known. */
  family: string | null;
}

const VIA: Readonly<Record<ShortLinkVisitor['kind'], VisitorVia>> = {
  user: 'account',
  phone: 'whatsapp',
};

export function visitorLook(visitor: ShortLinkVisitor): VisitorLook {
  const phone = visitor.kind === 'phone' ? visitor.phone : null;
  return {
    ...lookOf({ person: visitor.person, phone }, visitor.kind === 'phone'),
    via: VIA[visitor.kind],
    family: visitor.family ? visitor.family.name : null,
  };
}

const samePerson = (user: ShortLinkUser, v: ShortLinkVisitor): boolean =>
  user.person !== null && v.person?.id === user.person.id;
const samePhone = (user: ShortLinkUser, v: ShortLinkVisitor): boolean =>
  user.phone !== null && v.phone === user.phone;

/** Null when the listed user never opened it. */
export function visitOf(
  user: ShortLinkUser,
  visitors: readonly ShortLinkVisitor[],
): ShortLinkVisitor | null {
  return visitors.find((v) => samePerson(user, v) || samePhone(user, v)) ?? null;
}

export const notOpenedCount = (link: Pick<ShortLinkDetail, 'userList' | 'visitorList'>): number =>
  link.userList.filter((u) => visitOf(u, link.visitorList) === null).length;

