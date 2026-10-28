import type { LessonStatus } from '../../enums/index.js';

// Package balance rules, the TypeScript mirror of migration 123 (v_package_lessons,
// v_subscription_balance). The view is what the API reads; this mirror pins the same rules in unit
// tests and lets services reason about a change before it is written (R-SUB-01, R-SUB-03; E1, B5).

/** Outcomes that consume a unit when lesson_students.chargeable is true. */
export const CONSUMING_LESSON_STATUSES = [
  'completed',
  'late',
  'no_show',
  'excused',
] as const satisfies readonly LessonStatus[];

/** Booked, not happened: where the remaining units will go (projected end date). */
const BOOKED: readonly LessonStatus[] = ['scheduled', 'confirmed'];

export interface PackageLesson {
  lessonId: string;
  /** ISO instant. */
  startsAt: string;
  /** The lesson's local date in the student's tz, YYYY-MM-DD. */
  localDate: string;
  status: LessonStatus;
  /** lesson_students.chargeable (set by isChargeable at the outcome). */
  chargeable: boolean;
  /** The lesson's rule is a trial (schedule_rules.package = 'trial'): free. */
  trial: boolean;
  /** A حجز تعويضي (lessons.makeup_of_id): replaces a charged miss, so it never consumes a unit. */
  makeup: boolean;
  /** A حلقة فورية (lessons.instant, migration 190): an ad-hoc lesson, never consumes a unit. */
  instant?: boolean;
}

export interface PackageSubscription {
  id: string;
  lessonsTotal: number;
  /** Taken before the platform (migration 932, owner 2026-10-28): counted as used, never booked. */
  lessonsUsedBefore?: number;
  /** Local date in the student's tz, YYYY-MM-DD. */
  startsOn: string;
  /** ISO instant; breaks ties between packages starting the same day. */
  createdAt: string;
}

export interface SubscriptionBalance {
  subscriptionId: string;
  lessonsTotal: number;
  lessonsUsed: number;
  /** lessonsTotal − lessonsUsed; negative only on the newest package (attended past every package). */
  remaining: number;
  isLast: boolean;
  /** R-SUB-03: start of the lesson that used the last unit; null while units are left. */
  endedAt: string | null;
  /** Start of the booked lesson that would use the last unit; null if not enough are booked. */
  projectedEndAt: string | null;
}

/** Rules 1–3 of migration 123 plus 172 and 190: chargeable, has an outcome, not a trial, makeup or instant lesson. */
export function consumesPackage(l: Pick<PackageLesson, 'status' | 'chargeable' | 'trial' | 'makeup' | 'instant'>): boolean {
  return l.chargeable && !l.trial && !l.makeup && !l.instant && (CONSUMING_LESSON_STATUSES as readonly string[]).includes(l.status);
}

const byTime = (a: PackageLesson, b: PackageLesson) =>
  Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.lessonId.localeCompare(b.lessonId);
const byStart = (a: PackageSubscription, b: PackageSubscription) =>
  a.startsOn.localeCompare(b.startsOn) ||
  Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
  a.id.localeCompare(b.id);

/**
 * One student's balances, FIFO: consuming lessons on or after the first package's start fill the
 * packages in (startsOn, createdAt) order, each up to lessonsTotal − lessonsUsedBefore; overflow
 * lands on the newest. lessonsUsed includes lessonsUsedBefore (migration 932).
 * Returned in the same order as the packages.
 */
export function subscriptionBalances(input: {
  lessons: readonly PackageLesson[];
  subscriptions: readonly PackageSubscription[];
}): SubscriptionBalance[] {
  const subs = [...input.subscriptions].sort(byStart);
  const first = subs[0]?.startsOn;
  if (first === undefined) return [];
  const counted = input.lessons.filter((l) => l.localDate >= first && !l.trial && !l.makeup && !l.instant && l.chargeable);
  const used = counted.filter(consumesPackage).sort(byTime);
  const booked = counted.filter((l) => BOOKED.includes(l.status)).sort(byTime);
  let capFrom = 0;
  return subs.map((s, i) => {
    const before = s.lessonsUsedBefore ?? 0;
    const capTo = capFrom + s.lessonsTotal - before;
    const isLast = i === subs.length - 1;
    const upTo = isLast ? used.length : Math.min(used.length, capTo);
    const lessonsUsed = before + Math.max(0, upTo - capFrom);
    const left = capTo - used.length;
    const balance: SubscriptionBalance = {
      subscriptionId: s.id,
      lessonsTotal: s.lessonsTotal,
      lessonsUsed,
      remaining: s.lessonsTotal - lessonsUsed,
      isLast,
      endedAt: used[capTo - 1]?.startsAt ?? null,
      projectedEndAt: left > 0 ? (booked[left - 1]?.startsAt ?? null) : null,
    };
    capFrom = capTo;
    return balance;
  });
}
