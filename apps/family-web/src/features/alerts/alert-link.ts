import type { AlertTarget } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';

/** Where a bell row opens on the family pages: a TanStack `to` with its params and search. */
type AlertLink =
  | { to: '/report/$reportId'; params: { reportId: string }; search: { studentId: string } }
  | { to: '/children/$studentId'; params: { studentId: string }; search: { tab?: 'package' } }
  | { to: '/portal'; search: { tab?: 'package' } }
  | { to: '/schedule' };

type Screen = AlertTarget['screen'];
type Of<S extends Screen> = Extract<AlertTarget, { screen: S }>;
type Linkers = { [S in Screen]: (target: Of<S>, kind: PortalKind) => AlertLink };

/** A child's page: a guardian's /children/<id>, a student's own home. */
const CHILD_PAGE: Readonly<Record<PortalKind, (id: string, tab?: 'package') => AlertLink>> = {
  guardian: (studentId, tab) => ({ to: '/children/$studentId', params: { studentId }, search: { tab } }),
  student: (_id, tab) => ({ to: '/portal', search: { tab } }),
};

const LINKS: Linkers = {
  report: ({ reportId, studentId }) => ({
    to: '/report/$reportId',
    params: { reportId },
    search: { studentId },
  }),
  child: ({ studentId }, kind) => CHILD_PAGE[kind](studentId),
  package: ({ studentId }, kind) => CHILD_PAGE[kind](studentId, 'package'),
  schedule: () => ({ to: '/schedule' }),
};

/** The link of an alert's target (@ab/client-core alertTarget) for this login. */
export function alertLink(target: AlertTarget, kind: PortalKind): AlertLink {
  const link = LINKS[target.screen] as (target: AlertTarget, kind: PortalKind) => AlertLink;
  return link(target, kind);
}
