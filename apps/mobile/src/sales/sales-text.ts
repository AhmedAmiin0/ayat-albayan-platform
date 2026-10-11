import { localizedName, RIYADH_TZ, type SalesHistoryEntry, type SalesStudentView, type SalesTeacherView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { ltr } from '@/ui/Ltr';
import type { SalesSubscription } from './sales-api';

// Row lines of the salesperson's pages (docs/16), same words as the web. Western digits; dates and
// codes are LTR islands. Never a price, phone or link: the API does not send them.

const STATUS: Record<string, string | undefined> = t.enums.subscriptionStatus;
const PACKAGE: Record<string, string | undefined> = t.enums.packageSize;
const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: RIYADH_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** «{a} … {b}» → the values, every placeholder named once. */
export function fill(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.replace(`{${k}}`, v), text);
}

/** «2026-10-01»: the Riyadh calendar day of a UTC instant, Western digits. */
export function riyadhDate(iso: string): string {
  return DAY.format(new Date(iso));
}

/** A subscription status in words; an unknown one (newer API) as sent; none as «—». */
export function statusLabel(status: string | null): string {
  return status ? (STATUS[status] ?? status) : '—';
}

/** A package size in words («8 حلقات»); an unknown one as sent; none as «—». */
export function packageLabel(size: string | null): string {
  return size ? (PACKAGE[size] ?? size) : '—';
}

/** «الباقة · الحالة · 8 حلقة» under the student's name. */
export function subscriptionSubtitle(sub: SalesSubscription): string {
  const lessons = t.sales.subscriptions.lessons.replace('{n}', String(sub.lessons_total));
  return [packageLabel(sub.package), statusLabel(sub.status), lessons].join(' · ');
}

/** «تبدأ 2026-10-01», or nothing without a start day. */
export function startsLine(sub: SalesSubscription): string | undefined {
  return sub.starts_on ? t.sales.subscriptions.startsOn.replace('{date}', ltr(sub.starts_on)) : undefined;
}

/** The teacher's name in the app's language (the English one when set and the app runs in English). */
export function teacherLabel(teacher: SalesTeacherView): string {
  return localizedName({ ar: teacher.name, en: teacher.name_en }, locale);
}

/** «الجنس · البرامج» of a teacher. */
export function teacherSubtitle(teacher: SalesTeacherView): string {
  const programs = teacher.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
  return programs ? `${t.enums.gender[teacher.gender]} · ${programs}` : t.enums.gender[teacher.gender];
}

/** «المعلم/ة · البرنامج» of a student (or «بلا معلم»). */
export function studentSubtitle(student: SalesStudentView): string {
  return `${student.teacher_name ?? t.sales.allStudents.noTeacher} · ${t.enums.program[student.program]}`;
}

/** «ولي الأمر: …». */
export function guardianLine(student: SalesStudentView): string {
  return t.sales.mobile.guardianLine.replace('{name}', student.guardian_name);
}

export interface HistoryLines {
  heading: string;
  dates: string[];
  lessons: string;
  changes: string[];
  payments: string[];
}

/** The lines of one subscription in the history card: package and status, dates, lessons, events (no money). */
export function historyLines(entry: SalesHistoryEntry): HistoryLines {
  const h = t.sales.history;
  const dates = [fill(h.starts, { date: ltr(entry.starts_on) })];
  if (entry.renews_on) dates.push(fill(h.renews, { date: ltr(entry.renews_on) }));
  if (entry.ended_at) dates.push(fill(h.ended, { date: ltr(riyadhDate(entry.ended_at)) }));
  const used = fill(h.used, { used: String(entry.lessons_used), total: String(entry.lessons_total) });
  return {
    heading: `${packageLabel(entry.package)} · ${statusLabel(entry.status)}`,
    dates,
    lessons: `${used} · ${fill(h.remaining, { n: String(entry.lessons_remaining) })}`,
    changes: entry.status_changes.map((c) => {
      const what = c.from ? fill(h.changed, { from: statusLabel(c.from), to: statusLabel(c.to) }) : fill(h.created, { to: statusLabel(c.to) });
      return `${ltr(riyadhDate(c.at))} — ${what}`;
    }),
    payments: entry.payments.map((p) => `${ltr(riyadhDate(p.paid_at))} — ${t.enums.paymentKind[p.kind]}`),
  };
}
