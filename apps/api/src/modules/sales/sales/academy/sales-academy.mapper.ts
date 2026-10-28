import { countByKind, meetingModeOf, usesPlatform, type AssistantLessonView, type SalesStudentView, type SalesTeacherView } from '@ab/shared';
import type { SalesLiveRow, SalesStudentRow, SalesTeacherRow } from './sales-academy.queries';
import type { TeacherDayFacts } from '../schedule/sales-schedule.mapper';

/** What the schedule adds to a teacher row: today's facts by teacher id, the next lesson by student id. */
interface TeacherContext {
  facts: ReadonlyMap<string, TeacherDayFacts>;
  next: ReadonlyMap<string, string>;
  /** settings.meeting_link_auto: the default of a teacher whose meeting_mode is null (migration 490). */
  academyAuto?: boolean;
}

const NO_CONTEXT: TeacherContext = { facts: new Map(), next: new Map() };

// Whitelists, not omit-lists (docs/16): a column added to teachers or students later never reaches sales.

/**
 * An active teacher with today's lesson count, whether one is running now, the students they teach
 * now (a churned student is no longer theirs) by name, each with program, status and next lesson, the
 * «مشترك / تجريبي» counts of those, their fixed meeting link (owner 2026-10-12; null when unset) and
 * whether their lessons go out with our classroom (platform_classroom).
 */
export function toSalesTeacher(row: SalesTeacherRow, ctx: TeacherContext = NO_CONTEXT): SalesTeacherView {
  const today = ctx.facts.get(row.id);
  const current = row.students.filter((s) => s.status !== 'churned');
  const counts = countByKind(current);
  return {
    id: row.id,
    name: row.display_name_ar,
    name_en: row.display_name_en,
    gender: row.gender,
    programs: row.programs,
    lessons_today: today?.lessons_today ?? 0,
    live_now: today?.live_now ?? false,
    active_count: counts.active,
    trial_count: counts.trial,
    meeting_link: row.meeting_link?.trim() || null,
    platform_classroom: usesPlatform(meetingModeOf(row.meeting_mode), ctx.academyAuto ?? false),
    avatar_url: row.avatar_url ?? null,
    students: current
      .map((s) => ({ id: s.id, code: s.code ?? '', name: s.name, program: s.program, status: s.status, next_lesson_at: ctx.next.get(s.id) ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
  };
}

export function toSalesStudent(row: SalesStudentRow): SalesStudentView {
  return {
    id: row.id,
    code: row.code ?? '',
    name: row.name,
    status: row.status,
    program: row.program,
    teacher_name: row.teacher?.display_name_ar ?? null,
    guardian_name: row.guardian?.name ?? '',
    guardian_phone: row.guardian?.phone_e164 || null,
  };
}

/** The assistant's session row (AssistantHome's shape), so the web reuses its row and «ادخل الحلقة». */
export function toSalesLive(row: SalesLiveRow): AssistantLessonView {
  return {
    lesson_id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    teacher_name: row.teacher?.display_name_ar ?? '',
    student_names: row.lesson_students.flatMap((s) => (s.student ? [s.student.name] : [])),
  };
}
