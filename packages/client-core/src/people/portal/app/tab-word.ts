import type { ChildTab } from '../viewer.js';

// A login reading its own page gets the self wording; a guardian gets the child wording.

export interface ChildTabWords {
  portal: {
    upcomingTab: string;
    attendedTab: string;
    absentTab: string;
    packageTab: string;
    app: {
      child: { attendedSelf: string; absentSelf: string; chat: string; chatUnread: string };
    };
  };
  lessonFiles: { recordings: string };
}

type Word = (words: ChildTabWords, own: boolean) => string;

const WORD: Readonly<Record<ChildTab, Word>> = {
  upcoming: (w) => w.portal.upcomingTab,
  attended: (w, own) => (own ? w.portal.app.child.attendedSelf : w.portal.attendedTab),
  absent: (w, own) => (own ? w.portal.app.child.absentSelf : w.portal.absentTab),
  recordings: (w) => w.lessonFiles.recordings,
  package: (w) => w.portal.packageTab,
  chat: (w) => w.portal.app.child.chat,
};

/** The child tab's word; `own`: readsOwn(portalViewer(kind, student)). */
export const childTabWord = (tab: ChildTab, own: boolean, words: ChildTabWords): string =>
  WORD[tab](words, own);

export interface ChildTabPill {
  value: ChildTab;
  label: string;
  badge?: { count: number; label: string };
}

/** The chat tab carries its unread count, also in its screen reader name. */
export function childTabPill(
  tab: ChildTab,
  at: { own: boolean; unread: number },
  words: ChildTabWords,
): ChildTabPill {
  const label = childTabWord(tab, at.own, words);
  if (tab !== 'chat') return { value: tab, label };
  const named = words.portal.app.child.chatUnread.replace('{n}', String(at.unread));
  return { value: tab, label, badge: { count: at.unread, label: named } };
}
