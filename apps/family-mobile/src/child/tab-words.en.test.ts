import en from '@ab/shared/i18n/en.json';

// The five pills fit one 358pt row in English too (canvas ChatXFamilyEntry).
// A rough width at 14pt semibold: ~7.5pt a letter, 8 + 8 padding and 2 border a pill, 4 between,
// the unread badge 22pt with its gap.

const LETTER = 7.5;
const PILL = 18;
const GAP = 4;
const BADGE = 22;
const ROW = 358;

const width = (labels: readonly string[]): number =>
  labels.reduce((sum, word) => sum + word.length * LETTER + PILL, 0) +
  GAP * (labels.length - 1) +
  BADGE;

const P = en.portal;

test("a guardian's five English pills fit 358pt", () => {
  const labels = [P.upcomingTab, P.attendedTab, P.absentTab, P.packageTab, P.app.child.chat];
  expect(width(labels)).toBeLessThanOrEqual(ROW);
});

test("an adult's own five English pills fit 358pt", () => {
  const C = P.app.child;
  const labels = [P.upcomingTab, C.attendedSelf, C.absentSelf, P.packageTab, C.chat];
  expect(width(labels)).toBeLessThanOrEqual(ROW);
  expect(C.chat).toBe('Chat');
});
