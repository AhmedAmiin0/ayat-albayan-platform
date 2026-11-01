import {
  DAY_MS,
  dayInZone,
  dayWallToUtc,
  isCancelledLesson,
  isOpenLesson,
  meetingModeOf,
  RIYADH_TZ,
  type SalesScheduleLesson,
  usesPlatform,
} from '@ab/shared';
import type { SalesScheduleRow, UpcomingRow } from './sales-schedule.queries';

// Whitelists, not omit-lists: a column added to lessons later never reaches sales.

/** «الحلقة القادمة» looks this far ahead (weekly lessons: everyone booked has one inside it). */
export const UPCOMING_DAYS = 8;

/** Today's Riyadh calendar day, "YYYY-MM-DD". */
export function riyadhToday(now: Date): string {
  return new Date(dayInZone(now.getTime(), RIYADH_TZ)).toISOString().slice(0, 10);
}

/** The UTC instants bounding a Riyadh day "YYYY-MM-DD": [00:00, 24:00). */
export function riyadhDayRange(date: string): { from: Date; to: Date } {
  const day = Date.parse(`${date}T00:00:00Z`);
  return { from: new Date(dayWallToUtc(day, 0, RIYADH_TZ)), to: new Date(dayWallToUtc(day, 1440, RIYADH_TZ)) };
}

/** From now to UPCOMING_DAYS ahead. */
export function upcomingRange(now: Date): { from: Date; to: Date } {
  return { from: now, to: new Date(now.getTime() + UPCOMING_DAYS * DAY_MS) };
}

/** The way in: the trimmed link (blank → null) and whether the teacher holds it in our classroom. */
function wayIn(row: SalesScheduleRow, academyAuto: boolean): Pick<SalesScheduleLesson, 'meeting_link' | 'platform_classroom'> {
  return {
    meeting_link: row.meeting_link?.trim() || null,
    platform_classroom: usesPlatform(meetingModeOf(row.teacher?.meeting_mode), academyAuto),
  };
}

/**
 * One lesson for sales. `academyAuto` is settings.meeting_link_auto: the default of a teacher whose
 * meeting_mode is null (same resolver as the admin lessons and the sales teachers).
 */
export function toScheduleLesson(row: SalesScheduleRow, academyAuto: boolean): SalesScheduleLesson {
  const teacher = row.teacher;
  return {
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    trial: row.rule?.package === 'trial',
    makeup: row.makeup_of_id !== null,
    ...wayIn(row, academyAuto),
    teacher: {
      id: teacher?.id ?? '',
      display_name_ar: teacher?.display_name_ar ?? '',
      display_name_en: teacher?.display_name_en ?? null,
      ...(teacher?.tz ? { tz: teacher.tz } : {}),
    },
    students: row.lesson_students.flatMap(({ student: s }) =>
      s ? [{ id: s.id, code: s.code ?? '', name: s.name, ...(s.tz ? { tz: s.tz } : {}) }] : [],
    ),
  };
}

/** `mine` on each student she owns (docs/16 rows 36–37): her details sheet opens it and she may move or cancel the lesson. */
export function withMine<L extends { students: { id: string }[] }>(lesson: L, own: ReadonlySet<string>): L {
  return { ...lesson, students: lesson.students.map((s) => (own.has(s.id) ? { ...s, mine: true } : s)) };
}

export interface TeacherDayFacts {
  lessons_today: number;
  live_now: boolean;
}

/** Per teacher id: today's lessons (not cancelled) and whether one of them is running now. */
export function teacherDayFacts(rows: readonly SalesScheduleRow[], now: Date): Map<string, TeacherDayFacts> {
  const facts = new Map<string, TeacherDayFacts>();
  const at = now.getTime();
  for (const row of rows) {
    const id = row.teacher?.id;
    // Not counted in «حلقات اليوم»: cancelled ones (a moved-away one is never read).
    if (!id || isCancelledLesson(row.status)) continue;
    const running = isOpenLesson(row.status) && Date.parse(row.starts_at) <= at && at < Date.parse(row.ends_at);
    const prev = facts.get(id) ?? { lessons_today: 0, live_now: false };
    facts.set(id, { lessons_today: prev.lessons_today + 1, live_now: prev.live_now || running });
  }
  return facts;
}

/** Per student id: the start of their first upcoming open lesson (rows come by start). */
export function nextLessons(rows: readonly UpcomingRow[]): Map<string, string> {
  const next = new Map<string, string>();
  for (const row of rows) {
    for (const { student_id } of row.lesson_students) if (!next.has(student_id)) next.set(student_id, row.starts_at);
  }
  return next;
}
