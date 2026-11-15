import {
  joinNames,
  joinWindow,
  lessonWhenText,
  type JoinWindowConfig,
  type WindowLesson,
} from '@ab/shared';
import type { PushTarget } from '@/common/push/push.service';

// The family app's pushes (docs/50 §5 item 6), planned. Pure: FamilyPushRepo reads, this picks who
// hears what, PushService writes one row per kind, subject and profile (its dedup key, rule 8).

/** A lesson's join window counts as «just opened» until this long after the lesson starts. */
export const STARTED_GRACE_MIN = 15;
const MIN_MS = 60_000;

/** A student as the sweep reads it, with the guardian's login. */
export interface FamilyStudent {
  id: string;
  name: string;
  tz: string;
  /** The student's own login, if any. */
  profile_id: string | null;
  guardian: { profile_id: string | null; tz: string } | null;
}

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

/** One login to tell, in its own zone, about the students of theirs the event names. */
interface Reader {
  profileId: string;
  tz: string;
  names: string[];
  studentId: string;
}

/**
 * The lesson's window is open now and it started at most STARTED_GRACE_MIN ago: a sweep a little
 * late still tells the family, one long after the lesson began does not.
 */
export function windowJustOpened(lesson: WindowLesson, now: Date, win: JoinWindowConfig): boolean {
  const fresh = Date.parse(lesson.starts_at) >= now.getTime() - STARTED_GRACE_MIN * MIN_MS;
  return fresh && joinWindow(lesson, now, win).state === 'open';
}

/** Each student's guardian login and own login (an adult who is their own guardian: once). */
function loginsOf(s: FamilyStudent): { profileId: string; tz: string }[] {
  const guardian = s.guardian?.profile_id
    ? [{ profileId: s.guardian.profile_id, tz: s.guardian.tz }]
    : [];
  const shared = s.profile_id === s.guardian?.profile_id;
  const own = s.profile_id && !shared ? [{ profileId: s.profile_id, tz: s.tz }] : [];
  return [...guardian, ...own];
}

/** Every login to tell, siblings in one lesson under one guardian named together. */
export function familyReaders(students: readonly FamilyStudent[]): Reader[] {
  const byProfile = new Map<string, Reader>();
  const logins = students.flatMap((s) => loginsOf(s).map((login) => ({ ...login, s })));
  for (const { profileId, tz, s } of logins) {
    const found = byProfile.get(profileId);
    if (found) found.names.push(s.name);
    else byProfile.set(profileId, { profileId, tz, names: [s.name], studentId: s.id });
  }
  return [...byProfile.values()];
}

const target = (base: Omit<PushTarget, 'vars' | 'profileIds'>, at: string) => (r: Reader) => ({
  ...base,
  vars: { student: joinNames(r.names), when: lessonWhenText(new Date(at), r.tz) },
  data: { ...base.data, studentId: r.studentId },
  profileIds: [r.profileId],
});

/** «الحلقة على وشك البدء»: one push per login, keyed by the lesson. */
export function lessonStartingPushes(lesson: FamilyLesson): PushTarget[] {
  const base = { kind: 'lesson_starting' as const, subject: `lesson:${lesson.id}` };
  const make = target({ ...base, data: { lessonId: lesson.id } }, lesson.starts_at);
  return familyReaders(lesson.students).map(make);
}

/** «وصل تقرير الحلقة»: the student's guardian and own login, keyed by the report. */
export function reportSentPushes(report: SentReport): PushTarget[] {
  const data = { reportId: report.id, lessonId: report.lesson_id };
  const make = target(
    { kind: 'report_sent', subject: `report:${report.id}`, data },
    report.starts_at,
  );
  return familyReaders([report.student]).map(make);
}
