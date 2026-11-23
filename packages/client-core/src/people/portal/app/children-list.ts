import type { PortalHome, PortalKind, PortalStudent } from '@ab/shared';

// The children a guardian chooses between (canvas Adult, SwitchSheet): a
// guardian who also studies has their own student row (contact_is_self), named «أنا» and first.

type SelfFlag = Pick<PortalStudent, 'contact_is_self'>;

/** The guardian's own student row: shown as «أنا». */
export const isSelfChild = (kind: PortalKind, student: SelfFlag): boolean =>
  kind === 'guardian' && student.contact_is_self;

/** The login's students in list order: the guardian's own first, the rest as the API sent them. */
export function familyChildren(me: Pick<PortalHome, 'students'>): PortalStudent[] {
  const self = (s: SelfFlag): number => (s.contact_is_self ? 0 : 1);
  return [...me.students].sort((a, b) => self(a) - self(b));
}
