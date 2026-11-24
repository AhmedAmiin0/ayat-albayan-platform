import type { PortalHome, PortalKind, PortalStudent } from '@ab/shared';

// A guardian who also studies has their own student row (contact_is_self), shown first.

type SelfFlag = Pick<PortalStudent, 'contact_is_self'>;

export const isSelfChild = (kind: PortalKind, student: SelfFlag): boolean =>
  kind === 'guardian' && student.contact_is_self;

/** The login's students in list order: the guardian's own first, the rest as the API sent them. */
export function familyChildren(me: Pick<PortalHome, 'students'>): PortalStudent[] {
  const self = (s: SelfFlag): number => (s.contact_is_self ? 0 : 1);
  return [...me.students].sort((a, b) => self(a) - self(b));
}
