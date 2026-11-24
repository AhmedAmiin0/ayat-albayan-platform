import { isClosedLesson, isOpenLesson, type LessonView } from '@ab/schedule';

// docs/48 day rows rule: web lessonsOnDay keeps closed lessons, so the split drops them itself.

export type DayKind = 'empty' | 'rows' | 'heroOnly' | 'quiet';

export interface TodaySplit<L> {
  /** Not ended, not the hero, in start order. */
  rest: L[];
  /** Ended today (excused kept: its report is due). */
  done: L[];
  /** Today's not-yet-ended lessons, hero included. */
  open: number;
  kind: DayKind;
}

type DayLesson = Pick<LessonView, 'id' | 'status' | 'starts_at' | 'ends_at'>;

const past = (iso: string, now: Date) => Date.parse(iso) <= now.getTime();
/** Started and held lessons count as over; their report waits in the pending block (docs/48). */
const endedAt = (l: DayLesson, now: Date) =>
  past(l.ends_at, now) || (past(l.starts_at, now) && !isOpenLesson(l.status));

const KIND_RULES: readonly (readonly [DayKind, (s: KindInput) => boolean])[] = [
  ['empty', (s) => s.total === 0],
  ['rows', (s) => s.rest > 0],
  ['heroOnly', (s) => s.hero],
];

interface KindInput {
  total: number;
  rest: number;
  hero: boolean;
}

/** `heroId` is null when there is no hero; all ended with no hero is `quiet`. */
export function splitToday<L extends DayLesson>(
  lessons: readonly L[],
  at: { now: Date; heroId: string | null },
): TodaySplit<L> {
  const kept = lessons.filter((l) => !isClosedLesson(l.status));
  const ahead = kept.filter((l) => !endedAt(l, at.now));
  const rest = ahead.filter((l) => l.id !== at.heroId);
  const input = { total: kept.length, rest: rest.length, hero: at.heroId !== null };
  const kind = KIND_RULES.find(([, holds]) => holds(input))?.[0] ?? 'quiet';
  return { rest, done: kept.filter((l) => endedAt(l, at.now)), open: ahead.length, kind };
}
