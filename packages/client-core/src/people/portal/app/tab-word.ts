import type { PortalKind } from '@ab/shared';
import type { ChildTab } from '../viewer.js';

// A child page's tab names (docs/50 §6), shared by the family app and the family web pages: a
// student reads their own page («حضرتها»), a guardian their child's («حضرها»). Each app passes
// its `t.portal`.

export interface ChildTabWords {
  upcomingTab: string;
  attendedTab: string;
  absentTab: string;
  packageTab: string;
  app: { child: { attendedSelf: string; absentSelf: string; chat: string } };
}

const OWN: Readonly<Record<PortalKind, boolean>> = { guardian: false, student: true };

type Word = (words: ChildTabWords, own: boolean) => string;

const WORD: Readonly<Record<ChildTab, Word>> = {
  upcoming: (w) => w.upcomingTab,
  attended: (w, own) => (own ? w.app.child.attendedSelf : w.attendedTab),
  absent: (w, own) => (own ? w.app.child.absentSelf : w.absentTab),
  package: (w) => w.packageTab,
  chat: (w) => w.app.child.chat,
};

/** The child tab's word for this login. */
export const childTabWord = (tab: ChildTab, kind: PortalKind, words: ChildTabWords): string =>
  WORD[tab](words, OWN[kind]);
