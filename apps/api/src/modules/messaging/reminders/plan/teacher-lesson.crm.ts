import { joinNames, lessonWhenText, meetingLinkParts, type CrmValues } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import type { TeacherLessonTokens } from '@/modules/teaching/lesson-links';
import { classroomUrl, teacherReportUrl } from './reminders.links';

// A teacher's lesson as the CRM's own templates (the old Apps Script's, docs/19 «crm driver»), put
// beside the Meta values in template_params.crm (only the crm driver reads it): the new-student
// alert's teacher_lesson_v2 (teacher-alert.plan.ts) and the same-day reminder's
// teacher_lesson_reminder (reminders.plan.ts).

/**
 * A v2 URL button's {{1}}: the path after the origin. The CRM's v2 buttons are really
 * meet.google.com/{{1}} and the old Vercel report redirector, which forwards to
 * /report-link/legacy/<path> (owner 2026-11-06): teacher/report/<id> opens the no-login page.
 */
const suffix = (url: string): string => url.replace(/^\/+/, '');

/** The join suffix: a Meet lesson's code (meet.google.com/{{1}}), else our classroom path. */
const joinSuffix = (lesson: { id: string; meeting_link?: string | null }): string => {
  const { host, slug } = meetingLinkParts(lesson.meeting_link);
  return host === 'meet' && slug ? slug : suffix(classroomUrl('', lesson.id));
};

/** Meta refuses a parameter with a newline, a tab or 4+ spaces in a row: one line. */
export const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** A server text's {placeholders} (a function, so a `$` in a value stays as written). */
const fill = (text: string, values: Readonly<Record<string, string>>): string =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

export interface TeacherLessonInput {
  teacher: { display_name_ar?: string | null; tz: string };
  /** meeting_link: the lesson's own link (a Meet one fills the v2 join button with its code). */
  lesson: { id: string; starts_at: string; ends_at?: string | null; meeting_link?: string | null };
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

/** The lesson's values in the teacher's words: v2's body, and v3's {{1}}…{{5}}. */
interface LessonValues {
  teacher: string;
  names: string;
  codes: string;
  when: string;
  duration: string;
}

/** null when a value is missing (no name, a student without a code, no end). */
export function lessonValues(input: TeacherLessonInput): LessonValues | null {
  const who = coded(input);
  const { lesson } = input;
  const ms = lesson.ends_at ? Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at) : 0;
  const minutes = Math.round(ms / 60_000);
  if (!who || minutes <= 0) return null;
  return {
    teacher: who.teacher,
    names: joinNames(who.students.map((s) => s.name)),
    codes: who.students.map((s) => s.code).join(ar.common.listSeparator),
    when: lessonWhenText(new Date(lesson.starts_at), input.teacher.tz),
    duration: ar.templates.teacherLessonMinutes.replace('{n}', String(minutes)),
  };
}

/**
 * teacher_new_student's teacher_lesson_v2: body [teacher, students, their codes, the lesson time in
 * the teacher's tz, its duration]; buttons [«ادخل الحلقة» the Meet code or our classroom path,
 * «تقرير الحلقة» teacher/report/<id>]. null when a value is missing: Meta values only.
 */
export function teacherLessonCrm(input: TeacherLessonInput): CrmValues | null {
  const v = lessonValues(input);
  if (!v) return null;
  return {
    body: [v.teacher, v.names, v.codes, v.when, v.duration],
    buttons: [joinSuffix(input.lesson), suffix(teacherReportUrl('', input.lesson.id))],
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
  /** The lesson's signed links (the job makes them); none keeps the signed-in report page. */
  links?: TeacherLinks;
}

/** The teacher's signed links of one lesson (lesson-links, owner 2026-11-06: no short links). */
export type TeacherLinks = TeacherLessonTokens;

/** <join>: the lesson's own link (Meet, a fixed link, our classroom), else our classroom. */
export const ownJoin = (
  lesson: { id: string; meeting_link: string | null },
  origin: string,
): string => lesson.meeting_link?.trim() || classroomUrl(origin, lesson.id);

/** <join> and <report>: the lesson's own link, and the no-login report page (else signed-in). */
function lineLinks(input: TeacherReminderInput): { join: string; report: string } {
  const { origin, links, lesson } = input;
  const report = links?.report.url ?? teacherReportUrl(origin, lesson.id);
  return { join: ownJoin(lesson, origin), report };
}

/**
 * The same-day reminder as the CRM's teacher_lesson_reminder (the old script's: {{1}} the teacher,
 * {{2}} one line, no buttons): «<the time in the teacher's tz> · سهيلة (AB-0101) ومريم (AB-0102) ·
 * رابط الحلقة: <join> · تقرير الحلقة: <report>». join: the lesson's own link, else our classroom;
 * report: the teacher's no-login report page (else the signed-in one). Direct links, no short
 * links (owner 2026-11-06). null when a value is missing: Meta's values only.
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
    ...lineLinks(input),
  });
  return { body: [oneLine(who.teacher), oneLine(line)], buttons: [] };
}
