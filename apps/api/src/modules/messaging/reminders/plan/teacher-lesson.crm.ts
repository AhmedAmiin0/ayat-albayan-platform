import { joinNames, lessonWhenText, type CrmValues } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import { classroomUrl, teacherReportUrl } from './reminders.links';

// A teacher's lesson as the CRM's own templates (the old Apps Script's, docs/19 «crm driver»), put
// beside the Meta values in template_params.crm (only the crm driver reads it): the new-student
// alert's teacher_lesson_v2 (teacher-alert.plan.ts) and the same-day reminder's
// teacher_lesson_reminder (reminders.plan.ts).

/**
 * A v2 URL button's {{1}}: the path after the origin. ponytail: the CRM's v2 buttons are really
 * meet.google.com/{{1}} and the old report form's redirector (docs/19), so these two suffixes open
 * the wrong pages; kept as they are until the owner decides.
 */
const suffix = (url: string): string => url.replace(/^\/+/, '');

/** Meta refuses a parameter with a newline, a tab or 4+ spaces in a row: one line. */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** A server text's {placeholders} (a function, so a `$` in a value stays as written). */
const fill = (text: string, values: Readonly<Record<string, string>>): string =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

interface TeacherLessonInput {
  teacher: { display_name_ar?: string | null; tz: string };
  lesson: { id: string; starts_at: string; ends_at?: string | null };
  students: readonly { name: string; code?: string | null }[];
}

interface Coded {
  teacher: string;
  students: { name: string; code: string }[];
}

/**
 * The teacher's name and every student with a name and a code (AB-nnnn), in order; null when one
 * is missing (an older read), so a code never lines up with the wrong name.
 */
function coded(input: Pick<TeacherLessonInput, 'teacher' | 'students'>): Coded | null {
  const { teacher, students } = input;
  const name = teacher.display_name_ar?.trim();
  const ok = students.flatMap((s) => {
    const named = s.name.trim() !== '';
    return named && s.code ? [{ name: s.name, code: s.code }] : [];
  });
  const all = ok.length > 0 && ok.length === students.length;
  return name && all ? { teacher: name, students: ok } : null;
}

/**
 * teacher_new_student's teacher_lesson_v2: body [teacher, students, their codes, the lesson time in
 * the teacher's tz, its duration]; buttons [«ادخل الحلقة» the room, «تقرير الحلقة» the report
 * form]. null when a value is missing: the row then carries only the Meta values.
 */
export function teacherLessonCrm(input: TeacherLessonInput): CrmValues | null {
  const who = coded(input);
  const { lesson } = input;
  const ms = lesson.ends_at ? Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at) : 0;
  const minutes = Math.round(ms / 60_000);
  if (!who || minutes <= 0) return null;
  const names = joinNames(who.students.map((s) => s.name));
  const codes = who.students.map((s) => s.code).join(ar.common.listSeparator);
  const when = lessonWhenText(new Date(lesson.starts_at), input.teacher.tz);
  const duration = ar.templates.teacherLessonMinutes.replace('{n}', String(minutes));
  return {
    body: [who.teacher, names, codes, when, duration],
    buttons: [suffix(classroomUrl('', lesson.id)), suffix(teacherReportUrl('', lesson.id))],
  };
}

interface TeacherReminderInput {
  teacher: TeacherLessonInput['teacher'];
  /** As sentLinks gives it: meeting_link = the fixed link, our classroom (absolute) or null. */
  lesson: {
    id: string;
    starts_at: string;
    meeting_link: string | null;
    students: TeacherLessonInput['students'];
  };
  /** The web origin (firstWebOrigin): both links absolute; '' = no CRM values. */
  origin: string;
}

/**
 * The same-day reminder as the CRM's teacher_lesson_reminder (the old script's: {{1}} the teacher,
 * {{2}} one line, no buttons): «<the time in the teacher's tz> · سهيلة (AB-0101) ومريم (AB-0102) ·
 * رابط الحلقة: <join> · تقرير الحلقة: <report>». join: the lesson's own link (Meet, the teacher's
 * fixed link, our classroom), else our classroom; report: the teacher's report form. null when a
 * value is missing: the row then carries only the Meta values (meta_name on the CRM).
 */
export function teacherReminderCrm(input: TeacherReminderInput): CrmValues | null {
  const { lesson, origin } = input;
  const who = coded({ teacher: input.teacher, students: lesson.students });
  if (!who || !origin) return null;
  const text = ar.templates;
  const students = who.students.map((s) => fill(text.teacherReminderCrmStudent, s));
  const line = fill(text.teacherReminderCrm, {
    when: lessonWhenText(new Date(lesson.starts_at), input.teacher.tz),
    students: joinNames(students),
    join: lesson.meeting_link?.trim() || classroomUrl(origin, lesson.id),
    report: teacherReportUrl(origin, lesson.id),
  });
  return { body: [oneLine(who.teacher), oneLine(line)], buttons: [] };
}
