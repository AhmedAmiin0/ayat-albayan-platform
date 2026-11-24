import type { PrefilledPick } from '@ab/shared';
import type { PackageSize } from '@ab/catalog';

// The reduced flows of the booking wizard (teacher → slot → review): the assistant's course of a
// subscription, and a new trial date for an existing student. Types only.

/** The assistant's course of a subscription she sold (owner 2026-10-18, R-ASST-01). */
export interface CourseDraft {
  /** Days a week to pick, exactly (courseDaysPerWeek). */
  perWeek: number;
  /** Hold mode: unpaid with an open link, booking saves a draft; absent means false. */
  hold?: boolean;
  /** The lessons to book (courseLessonCount: lessons_total − lessons_used_before): the course stops after it. */
  lessonsTotal: number;
  /** The subscription's package; null = a custom count (labels use lessonsTotal, never the body's package). */
  package: PackageSize | null;
  /** The first local day it may start (courseOpensOn: the subscription's, or after the previous course): the slot grid opens on its week. */
  startsOn: string;
  /** A pick equal to a prefilled one keeps its time (DST-safe); a clash names its day. */
  prefilled?: readonly PrefilledPick[];
}

/** One trial lesson for an existing student (R-SCH-06) via POST {base}/trial-date. */
export interface TrialDateDraft {
  /** The upcoming trial the new date moves (history.upcoming_id); null = a new trial lesson. */
  upcomingId: string | null;
  /** That trial's start (UTC instant) for the move note; null without one. */
  upcomingAt: string | null;
  /** Dates picked so far (history.count): the new one is count + 1 (warnsTrialDate). */
  count: number;
}
