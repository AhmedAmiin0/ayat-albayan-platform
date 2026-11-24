import { counted, type PluralForm } from '@ab/core';
import { clockParts, type CountdownParts, type LessonClock } from './countdown.js';

// The live countdown in words (moved from the web portal's card, docs/50 §7): each app passes its
// own `t.portal` (the same keys in ar.json / en.json).

export interface CountdownWords {
  /** «الحلقة جارية الآن». */
  now: string;
  /** «يُتاح الدخول بعد {time}». */
  opensIn: string;
  /** «تبدأ الحلقة بعد {time}». */
  startsIn: string;
  days: Readonly<Record<PluralForm, string>>;
}

/** «يومان 03:15:20», or just «03:15:20» under a day (Western digits). */
const leftText = (parts: CountdownParts, words: Pick<CountdownWords, 'days'>): string =>
  parts.days > 0 ? `${counted(words.days, parts.days)} ${clockParts(parts)}` : clockParts(parts);

type Counting = Exclude<LessonClock['kind'], 'now'>;

const COUNTING: Record<Counting, (words: CountdownWords) => string> = {
  opensIn: (words) => words.opensIn,
  startsIn: (words) => words.startsIn,
};

/** The card's clock line: «الحلقة جارية الآن», else what is left until the window or the start. */
export function lessonClockText(clock: LessonClock, words: CountdownWords): string {
  if (clock.kind === 'now') return words.now;
  return COUNTING[clock.kind](words).replace('{time}', leftText(clock.parts, words));
}
