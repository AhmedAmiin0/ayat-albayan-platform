import type { ChildTab } from '../viewer.js';

// A child page's tab names (docs/50 §6), shared by the family app and the family web pages: a
// login that reads its own page (a student, an adult: readsOwn) sees «حضرتها», a guardian their
// child's «حضرها». Each app passes its `t`.

export interface ChildTabWords {
  portal: {
    upcomingTab: string;
    attendedTab: string;
    absentTab: string;
    packageTab: string;
    app: { child: { attendedSelf: string; absentSelf: string; chat: string } };
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
