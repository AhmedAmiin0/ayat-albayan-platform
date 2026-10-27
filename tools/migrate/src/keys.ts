// Natural keys per entity (README §Natural keys). The only place keys are built: a key that changes
// between runs creates a second row, so every builder imports from here and never concatenates by hand.
import { normalizeArabic } from '@ab/shared';
import type { EntityName, NaturalKey } from './types.ts';

// Honorifics dropped from person keys (docs/06 step 3). «أم/ام» stays: «ام ليلى» is a different
// person from her daughter «ليلى» on the same phone.
const TITLES =
  /^(?:الاستاذه|الاستاذ|استاذه|استاذ|ا\.|د\.|دكتوره|دكتور|الحاجه|الحاج|المعلمه|معلمه)\s*:?\s*/;

/** normalizeArabic + leading honorifics removed + punctuation squeezed. Used for name parts of keys. */
export function personName(raw: string): string {
  let s = normalizeArabic(raw)
    .replace(/[«»"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let prev = ''; prev !== s;) {
    prev = s;
    s = s.replace(TITLES, '').trim();
  }
  return s;
}

/** Lower-case Latin slug: «Mariam Adel» → 'mariam adel' (same shape as HUB «المعلم (من السجل)»). */
export function teacherSlug(nameEn: string): string {
  return nameEn.trim().toLowerCase().replace(/\s+/g, ' ');
}

function k(entity: EntityName, key: string): NaturalKey {
  return { entity, key };
}

/** Stable "entity:key" id, used for maps and import_items lookups. */
export function keyId(nk: NaturalKey): string {
  return `${nk.entity}:${nk.key}`;
}

interface StudentKeyInput {
  guardianPhone: string;
  name: string;
}
interface LessonKeyInput {
  teacher: string;
  /** Student natural keys (key part). One for a 1:1 lesson, several for a group. */
  students: readonly string[];
  /** UTC instant (ISO) for rule occurrences/trials; local 'YYYY-MM-DD' for report-derived lessons. */
  at: string;
}

const sorted = (xs: readonly string[]): string => [...xs].sort().join('+');

export const keys = {
  /** teacherSlug(display_name_en) — 'abrar', 'mariam adel'. */
  teacher: (slug: string) => k('teachers', teacherSlug(slug)),
  /** E.164 phone. */
  guardian: (e164: string) => k('guardians', e164),
  /** '+9665…|نوره' — guardian phone + personName(name). */
  student: (o: StudentKeyInput) => k('students', `${o.guardianPhone}|${personName(o.name)}`),
  lead: (e164: string) => k('leads', e164),
  jobApplicant: (e164: string) => k('job_applicants', e164),
  /**
   * One rule per teacher + student set (issue B1: the latest row wins). `slot` ('HH:mm') only for
   * a HEART timetable row whose days have different times: one rule per time.
   */
  scheduleRule: (o: Omit<LessonKeyInput, 'at'> & { slot?: string }) =>
    k('schedule_rules', `${o.teacher}|${sorted(o.students)}${o.slot ? `@${o.slot}` : ''}`),
  scheduleRuleStudent: (o: { rule: string; student: string }) =>
    k('schedule_rule_students', `${o.rule}|${o.student}`),
  lesson: (o: LessonKeyInput) => k('lessons', `${o.teacher}|${sorted(o.students)}|${o.at}`),
  lessonStudent: (o: { lesson: string; student: string }) =>
    k('lesson_students', `${o.lesson}|${o.student}`),
  /** One report per lesson and student (R-REP-04): same shape as lessonStudent. */
  lessonReport: (o: { lesson: string; student: string }) =>
    k('lesson_reports', `${o.lesson}|${o.student}`),
  reportPdf: (report: string) => k('report_pdfs', report),
  /** student key + local start day. */
  subscription: (o: { student: string; startsOn: string }) =>
    k('subscriptions', `${o.student}|${o.startsOn}`),
  payment: (o: { subscription: string; paidOn: string; amount: number }) =>
    k('payments', `${o.subscription}|${o.paidOn}|${o.amount}`),
  /** month = 'YYYY-MM-01'. */
  expense: (o: { month: string; category: string; note: string; amount: number }) =>
    k('expenses', `${o.month}|${o.category}|${personName(o.note)}|${o.amount}`),
  messageTemplate: (name: string) => k('message_templates', name.trim()),
  /** Meta wamid when known (unique in messages.wa_message_id), else the CRM row id. */
  message: (o: { waMessageId?: string | null; crmId: string }) =>
    k('messages', o.waMessageId ? o.waMessageId : `crm:${o.crmId}`),
};
