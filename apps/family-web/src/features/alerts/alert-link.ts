import type { AlertTarget, ChildTab } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';

/** A child page's tab an alert opens; none means the upcoming tab. */
type AlertTab = Extract<ChildTab, 'package' | 'chat'>;

/** Where a bell row opens on the family pages: a TanStack `to` with its params and search. */
type AlertLink =
  | { to: '/report/$reportId'; params: { reportId: string }; search: { studentId: string } }
  | { to: '/children/$studentId'; params: { studentId: string }; search: { tab?: AlertTab } }
  | { to: '/portal'; search: { tab?: AlertTab } }
  | { to: '/schedule' };

/** The login's kind, and whether the chat tab exists (family_chat_enabled). */
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

/** The chat tab only while it exists. */
const chatTab = (chatOn: boolean): AlertTab | undefined => (chatOn ? 'chat' : undefined);

const LINKS: Linkers = {
  report: ({ reportId, studentId }) => ({
    to: '/report/$reportId',
    params: { reportId },
    search: { studentId },
  }),
  child: ({ studentId }, { kind }) => CHILD_PAGE[kind](studentId),
  package: ({ studentId }, { kind }) => CHILD_PAGE[kind](studentId, 'package'),
  // The child's chat tab while family_chat_enabled is on; off, the child's page.
  chat: ({ studentId }, { kind, chatOn }) => CHILD_PAGE[kind](studentId, chatTab(chatOn)),
  // Lesson started: the upcoming tab, where the lesson card joins the room.
  live: ({ studentId }, { kind }) => CHILD_PAGE[kind](studentId),
  schedule: () => ({ to: '/schedule' }),
};

/** The link of an alert's target (@ab/client-core alertTarget) for this login. */
export function alertLink(target: AlertTarget, viewer: AlertViewer): AlertLink {
  const link = LINKS[target.screen] as (target: AlertTarget, viewer: AlertViewer) => AlertLink;
  return link(target, viewer);
}
