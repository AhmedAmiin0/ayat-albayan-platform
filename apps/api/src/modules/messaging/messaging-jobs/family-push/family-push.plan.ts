import { joinWindow, type JoinWindowConfig, type WindowLesson } from '@ab/shared';
import { familyTargets, type FamilyStudent } from '@/common/push/family-readers';
import type { PushTarget } from '@/common/push/push.service';

// The family app's pushes (docs/50 §5 item 6), planned. Pure: FamilyPushRepo reads, this picks who
// hears what, PushService writes one row per kind, subject and profile (its dedup key, rule 8).

/** A lesson's join window counts as «just opened» until this long after the lesson starts. */
export const STARTED_GRACE_MIN = 15;
const MIN_MS = 60_000;

export interface FamilyLesson extends WindowLesson {
  id: string;
  students: readonly FamilyStudent[];
}

export interface SentReport {
  id: string;
  lesson_id: string;
  /** The lesson's start: the time the push names. */
  starts_at: string;
  student: FamilyStudent;
}

/**
 * The lesson's window is open now and it started at most STARTED_GRACE_MIN ago: a sweep a little
 * late still tells the family, one long after the lesson began does not.
 */
export function windowJustOpened(lesson: WindowLesson, now: Date, win: JoinWindowConfig): boolean {
  const fresh = Date.parse(lesson.starts_at) >= now.getTime() - STARTED_GRACE_MIN * MIN_MS;
  return fresh && joinWindow(lesson, now, win).state === 'open';
}

/** One push per login, keyed by the lesson. */
export function lessonStartingPushes(lesson: FamilyLesson): PushTarget[] {
  const subject = `lesson:${lesson.id}`;
  const event = { kind: 'lesson_starting' as const, subject, data: { lessonId: lesson.id } };
  return familyTargets(event, { at: lesson.starts_at, students: lesson.students });
}

/** To the student's guardian and own login, keyed by the report. */
export function reportSentPushes(report: SentReport): PushTarget[] {
  const data = { reportId: report.id, lessonId: report.lesson_id };
  const event = { kind: 'report_sent' as const, subject: `report:${report.id}`, data };
  return familyTargets(event, { at: report.starts_at, students: [report.student] });
}
