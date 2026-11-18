import type { AlertTarget } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';

/** A child page's tab an alert opens; none = «القادمة». */
type AlertTab = 'package' | 'chat';

/** Where a bell row opens on the family pages: a TanStack `to` with its params and search. */
type AlertLink =
  | { to: '/report/$reportId'; params: { reportId: string }; search: { studentId: string } }
  | { to: '/children/$studentId'; params: { studentId: string }; search: { tab?: AlertTab } }
  | { to: '/portal'; search: { tab?: AlertTab } }
  | { to: '/schedule' };

/** Who opens it: the login's kind, and whether «المحادثة» exists (family_chat_enabled). */
interface AlertViewer {
  kind: PortalKind;
  chatOn: boolean;
}

type Screen = AlertTarget['screen'];
type Of<S extends Screen> = Extract<AlertTarget, { screen: S }>;
type Linkers = { [S in Screen]: (target: Of<S>, viewer: AlertViewer) => AlertLink };

/** A child's page: a guardian's /children/<id>, a student's own home. */
const CHILD_PAGE: Readonly<Record<PortalKind, (id: string, tab?: AlertTab) => AlertLink>> = {
  guardian: (studentId, tab) => ({ to: '/children/$studentId', params: { studentId }, search: { tab } }),
  student: (_id, tab) => ({ to: '/portal', search: { tab } }),
};

/** A chat alert's tab: «المحادثة» only while it exists. */
const chatTab = (chatOn: boolean): AlertTab | undefined => (chatOn ? 'chat' : undefined);

const LINKS: Linkers = {
  report: ({ reportId, studentId }) => ({
    to: '/report/$reportId',
    params: { reportId },
    search: { studentId },
  }),
  child: ({ studentId }, { kind }) => CHILD_PAGE[kind](studentId),
  package: ({ studentId }, { kind }) => CHILD_PAGE[kind](studentId, 'package'),
  // The child's «المحادثة» while family_chat_enabled is on; off: the child's page.
  chat: ({ studentId }, { kind, chatOn }) => CHILD_PAGE[kind](studentId, chatTab(chatOn)),
  // «بدأت الحلقة»: «القادمة», where the lesson's card joins the room in the page.
  live: ({ studentId }, { kind }) => CHILD_PAGE[kind](studentId),
  schedule: () => ({ to: '/schedule' }),
};

/** The link of an alert's target (@ab/client-core alertTarget) for this login. */
export function alertLink(target: AlertTarget, viewer: AlertViewer): AlertLink {
  const link = LINKS[target.screen] as (target: AlertTarget, viewer: AlertViewer) => AlertLink;
  return link(target, viewer);
}
