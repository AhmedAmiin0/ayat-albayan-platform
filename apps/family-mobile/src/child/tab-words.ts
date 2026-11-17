import type { ChildTab } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** A student reads their own page («حضرتها»), a guardian their child's («حضرها»). */
const OWN: Record<PortalKind, boolean> = { guardian: false, student: true };

const WORD: Record<ChildTab, (own: boolean) => string> = {
  upcoming: () => t.portal.upcomingTab,
  attended: (own) => (own ? t.portal.app.child.attendedSelf : t.portal.attendedTab),
  absent: (own) => (own ? t.portal.app.child.absentSelf : t.portal.absentTab),
  recordings: () => t.lessonFiles.recordings,
  package: () => t.portal.packageTab,
  chat: () => t.portal.app.child.chat,
};

/** The child tab's word for this login. */
export const tabWord = (tab: ChildTab, kind: PortalKind): string => WORD[tab](OWN[kind]);
