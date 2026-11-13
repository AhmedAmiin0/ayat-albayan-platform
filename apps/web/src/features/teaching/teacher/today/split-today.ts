import { isClosedLesson, isOpenLesson, type LessonView } from '@ab/shared';

// docs/48 «Day rows rule»: «بقية اليوم» = today's lessons not closed and not ended, the hero out;
// ended ones fold under «انتهت n حلقات اليوم». Web lessonsOnDay keeps closed lessons (unlike mobile
// lessonsOn), so the split drops them itself: a cancelled or moved slot never shows as a row.

/** What the «اليوم» panel shows under the hero. */
export type DayKind = 'empty' | 'rows' | 'heroOnly' | 'quiet';

export interface TodaySplit<L> {
  /** Not ended, not the hero, in start order. */
  rest: L[];
  /** Ended today (excused kept: its report is due). */
  done: L[];
  /** The tab's «اليوم n»: today's open-to-come lessons, hero included. */
  open: number;
  kind: DayKind;
}

type DayLesson = Pick<LessonView, 'id' | 'status' | 'starts_at' | 'ends_at'>;

const past = (iso: string, now: Date) => Date.parse(iso) <= now.getTime();
/**
 * Over for her day: ended, or started and already held (marked «تمت» early, excused, no-show):
 * its report then waits in the pending block only, never on a row too (docs/48).
 */
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

/**
 * Splits today's lessons (already on her calendar day) around the hero: `heroId` null when there
 * is none. All ended with no hero is «انتهت حلقات اليوم» (`quiet`).
 */
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
