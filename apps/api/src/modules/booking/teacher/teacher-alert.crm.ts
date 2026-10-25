import { joinNames, lessonWhenText, type CrmValues } from '@ab/shared';
import { ar } from '../../../common/i18n/server-text';
import { classroomUrl, teacherReportUrl } from '../../reminders/reminders.links';
import type { AlertLesson, AlertTeacher } from './teacher-alert.plan';

// The teacher's new-student alert as the CRM's teacher_lesson_v2 (the old Apps Script's, docs/19 «crm
// driver»): written beside the Meta values in template_params.crm, read only when the line is on crm.

/** A URL button's {{1}}: the platform link without the web origin (the CRM's button base is `<WEB_ORIGIN>/{{1}}`). */
const suffix = (url: string): string => url.replace(/^\/+/, '');

export interface CrmAlertInput {
  teacher: AlertTeacher;
  lesson: AlertLesson;
  students: readonly { name: string; code?: string | null }[];
}

/**
 * Body [teacher, students, their codes (AB-nnnn), the lesson time in the teacher's tz, its duration]; buttons
 * [«ادخل الحلقة» the lesson's room, «تقرير الحلقة» the teacher's report form]. null when a value is missing
 * (an older read): the row then carries only the Meta values.
 */
export function teacherAlertCrm({ teacher, lesson, students }: CrmAlertInput): CrmValues | null {
  // One student list for both values, so the codes line up with the names (a student without either: null).
  const named = students.filter((s) => s.name.trim() !== '');
  if (named.length !== students.length || named.some((s) => !s.code)) return null;
  const names = joinNames(named.map((s) => s.name));
  const codes = named.map((s) => s.code).join(ar.common.listSeparator);
  const minutes = lesson.ends_at ? Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60_000) : 0;
  const name = teacher.display_name_ar?.trim();
  if (!name || !names || !codes || minutes <= 0) return null;
  return {
    body: [name, names, codes, lessonWhenText(new Date(lesson.starts_at), teacher.tz), ar.templates.teacherLessonMinutes.replace('{n}', String(minutes))],
    buttons: [suffix(classroomUrl('', lesson.id)), suffix(teacherReportUrl('', lesson.id))],
  };
}
