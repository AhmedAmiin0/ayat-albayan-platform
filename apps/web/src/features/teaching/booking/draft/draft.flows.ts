import type { PackageSize, PrefilledPick } from '@ab/shared';

// The reduced flows of the booking wizard (teacher → slot → review): the assistant's course of a
// subscription, and a new trial date for an existing student. Types only.

/** The assistant's course of a subscription she sold (owner 2026-10-18, R-ASST-01). */
export interface CourseDraft {
  /** Days a week to pick, exactly (courseDaysPerWeek). */
  perWeek: number;
  /** subscriptions.lessons_total: the course stops after it. */
  lessonsTotal: number;
  /** The subscription's package; null = a custom count (labels use lessonsTotal, never the body's package). */
  package: PackageSize | null;
  /** The first local day it may start (courseOpensOn: the subscription's, or after the previous course): the slot grid opens on its week. */
  startsOn: string;
  /**
   * «تابِع بنفس الأيام»: the previous course's days as picks (prefillDays), each with its day's own
   * time: a pick still equal to one keeps that time in the body (DST-safe); a clash on one names its day.
   */
  prefilled?: readonly PrefilledPick[];
}

/**
 * «موعد تجريبي جديد» (owner 2026-10-25, R-SCH-06): one trial lesson for one existing student, booked
 * through POST {base}/trial-date. From GET {base}/trial-dates (TrialHistory).
 */
export interface TrialDateDraft {
  /** The upcoming trial the new date moves (history.upcoming_id); null = a new trial lesson. */
  upcomingId: string | null;
  /** That trial's start (UTC instant), for the «سيُنقل» note; null without one. */
  upcomingAt: string | null;
  /** Dates picked so far (history.count): the new one is count + 1 (warnsTrialDate). */
  count: number;
}
