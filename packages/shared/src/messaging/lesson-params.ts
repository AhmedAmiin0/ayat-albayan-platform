import { clockTime } from '../running-head.js';
import { joinNames, lessonWhenText } from './booking-confirmation.js';
import { meetingLinkParts } from './meeting-link.js';
import { BODY_SLOTS, type BodySlot, type TemplateButton } from './templates.js';
import type { ThreadLesson } from './views.js';

// Template variables that come from a lesson (rule 6: never typed by hand). The inbox composer
// fills them from the lesson the admin picks, in the recipient's tz, with the producers' formats.

/** Variable names (message_templates.params) whose value is a time: only ever from a lesson. */
export const LESSON_TIME_PARAMS: readonly string[] = ['lesson_when', 'lesson_time', 'lesson_slot'];

/** The template needs a lesson picked: one of its variables is a lesson time. */
export function needsLesson(params: readonly string[]): boolean {
  return params.some((p) => LESSON_TIME_PARAMS.includes(p));
}

/**
 * The value of variable `name` for this lesson, as the producers write it: «الأحد 4 أكتوبر 17:00»
 * (lesson_when), «17:00» (lesson_time), «17:00 — سهيلة ومريم» (lesson_slot), the students' names.
 * null for a variable a lesson does not answer.
 */
export function lessonParamValue(name: string, lesson: ThreadLesson): string | null {
  const startsAt = new Date(lesson.starts_at);
  const names = joinNames(lesson.student_names);
  switch (name) {
    case 'lesson_when':
      return lessonWhenText(startsAt, lesson.tz);
    case 'lesson_time':
      return clockTime(startsAt, lesson.tz);
    case 'lesson_slot':
      return `${clockTime(startsAt, lesson.tz)} — ${names}`;
    case 'student_names':
      return names || null;
    case 'student_name':
      return lesson.student_names[0] ?? null;
    default:
      return null;
  }
}

/** The meeting code for a URL button of this host (meet.jit.si / meet.google.com), else null. */
export function lessonButtonSlug(lesson: ThreadLesson, buttonUrl: string): string | null {
  const { host, slug } = meetingLinkParts(lesson.meeting_link);
  if (!slug) return null;
  if (host === 'jitsi' && buttonUrl.includes('meet.jit.si')) return slug;
  return host === 'meet' && buttonUrl.includes('meet.google.com') ? slug : null;
}

/**
 * A template's {{1}}…{{9}} and URL-button code filled from a lesson, by the variables' names (only
 * those a lesson answers): what the inbox composers (web and app) put in when a lesson is picked.
 */
export function lessonParams(
  template: { params: readonly string[]; buttons: readonly TemplateButton[] },
  lesson: ThreadLesson,
): Partial<Record<BodySlot | 'button', string>> {
  const out: Partial<Record<BodySlot | 'button', string>> = {};
  template.params.slice(0, BODY_SLOTS.length).forEach((name, i) => {
    const value = lessonParamValue(name, lesson);
    const at = BODY_SLOTS[i];
    if (value && at) out[at] = value;
  });
  const url = template.buttons.find((b) => b.type === 'url');
  const slug = url?.type === 'url' && url.url.includes('{{1}}') ? lessonButtonSlug(lesson, url.url) : null;
  if (slug) out.button = slug;
  return out;
}

/** Teacher templates go to teachers only, and a teacher gets nothing else (docs/12 §2.1). */
export function forAudience(key: string, teacher: boolean): boolean {
  return key.startsWith('teacher_') === teacher;
}
