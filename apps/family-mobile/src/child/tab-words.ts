import type { ChildTab } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

const WORD: Record<ChildTab, (own: boolean) => string> = {
  upcoming: () => t.portal.upcomingTab,
  attended: (own) => (own ? t.portal.app.child.attendedSelf : t.portal.attendedTab),
  absent: (own) => (own ? t.portal.app.child.absentSelf : t.portal.absentTab),
  recordings: () => t.lessonFiles.recordings,
  package: () => t.portal.packageTab,
  chat: () => t.portal.app.child.chat,
};

/**
 * The child tab's word: a student or an adult reads their own page («حضرتها», @ab/client-core
 * readsOwn), a guardian their child's («حضرها»).
 */
export const tabWord = (tab: ChildTab, own: boolean): string => WORD[tab](own);
