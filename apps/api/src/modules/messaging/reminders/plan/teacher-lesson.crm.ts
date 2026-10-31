import { joinNames, lessonWhenText, type CrmValues } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import { classroomUrl, teacherReportUrl } from './reminders.links';

// A teacher's lesson as the CRM's teacher_lesson_v2 (the old Apps Script's, docs/19 «crm driver»):
// the new-student alert (teacher-alert.plan.ts) and the same-day reminder (reminders.plan.ts) put
// it beside the Meta values in template_params.crm; only the crm driver reads it.

/** A URL button's {{1}}: the path after the origin (the CRM's button is `<WEB_ORIGIN>/{{1}}`). */
const suffix = (url: string): string => url.replace(/^\/+/, '');

interface TeacherLessonInput {
  teacher: { display_name_ar?: string | null; tz: string };
  lesson: { id: string; starts_at: string; ends_at?: string | null };
  students: readonly { name: string; code?: string | null }[];
}

/**
 * Body [teacher, students, their codes (AB-nnnn), the lesson time in the teacher's tz, its
 * duration]; buttons [«ادخل الحلقة» the lesson's room, «تقرير الحلقة» the teacher's report form].
 * null when a value is missing (an older read): the row then carries only the Meta values.
 */
export function teacherLessonCrm(input: TeacherLessonInput): CrmValues | null {
  const { teacher, lesson, students } = input;
  // One student list for both values, so the codes line up with the names (no name or code: null).
  const named = students.filter((s) => s.name.trim() !== '');
  if (named.length !== students.length || named.some((s) => !s.code)) return null;
  const names = joinNames(named.map((s) => s.name));
  const codes = named.map((s) => s.code).join(ar.common.listSeparator);
  const ms = lesson.ends_at ? Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at) : 0;
  const minutes = Math.round(ms / 60_000);
  const name = teacher.display_name_ar?.trim();
  if (!name || !names || !codes || minutes <= 0) return null;
  const when = lessonWhenText(new Date(lesson.starts_at), teacher.tz);
  const duration = ar.templates.teacherLessonMinutes.replace('{n}', String(minutes));
  return {
    body: [name, names, codes, when, duration],
    buttons: [suffix(classroomUrl('', lesson.id)), suffix(teacherReportUrl('', lesson.id))],
  };
}
