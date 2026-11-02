import {
  localizedName,
  wallParts,
  type ClockCycle,
  type SalesHistoryEntry,
  type SalesStudentView,
  type SalesTeacherStudent,
  type SalesTeacherView,
} from '@ab/shared';
import { whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { money } from '@/core/lib/money/format';
import { ltr } from '@/core/ui/primitives/Ltr';
import type { SalesSubscription } from './sales-api';

// Row lines of the salesperson's pages (docs/16), same words as the web. Western digits; dates and
// codes are LTR islands. Never a price or link: the API does not send them (the guardian's phone, owner
// 2026-10-27, is its own LTR element, PhoneText).

const STATUS: Record<string, string | undefined> = t.enums.subscriptionStatus;
const PACKAGE: Record<string, string | undefined> = t.enums.packageSize;

/** «{a} … {b}» → the values, every placeholder named once. */
export function fill(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.replace(`{${k}}`, v), text);
}

/** «2026-10-01»: the viewer's calendar day of a UTC instant, Western digits. */
export function viewerDate(iso: string, tz: string): string {
  return wallParts(iso, tz).date;
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

/** «الطلاب: 4 · حلقات اليوم: 2» of a teacher row. */
export function teacherCounts(teacher: SalesTeacherView): string {
  const s = t.sales.teachers;
  return `${s.studentsCount.replace('{n}', String(teacher.students.length))} · ${s.lessonsToday.replace('{n}', String(teacher.lessons_today))}`;
}

/** «الحلقة القادمة: الاثنين 12 أكتوبر 18:00» (viewer), or «لا حلقة خلال الأيام الثمانية القادمة». */
export function nextLessonLine(
  student: Pick<SalesTeacherStudent, 'next_lesson_at'>,
  cycle: ClockCycle,
  tz: string,
): string {
  const s = t.sales.teachers;
  if (!student.next_lesson_at) return s.noNextLesson;
  return `${s.nextLesson}: ${whenIn(new Date(student.next_lesson_at), tz, cycle)}`;
}


/** «المعلم/ة · البرنامج» of a student (or «بلا معلم»). */
export function studentSubtitle(student: SalesStudentView): string {
  return `${student.teacher_name ?? t.sales.allStudents.noTeacher} · ${t.enums.program[student.program]}`;
}

/** «ولي الأمر: …». */
export function guardianLine(student: SalesStudentView): string {
  return t.sales.mobile.guardianLine.replace('{name}', student.guardian_name);
}

interface HistoryLines {
  heading: string;
  dates: string[];
  lessons: string;
  changes: string[];
  payments: string[];
}

/** The lines of one subscription in the history card: package and status, dates, lessons, events, payments with their amount (owner, 2026-10-11). */
export function historyLines(entry: SalesHistoryEntry, tz: string): HistoryLines {
  const h = t.sales.history;
  const dates = [fill(h.starts, { date: ltr(entry.starts_on) })];
  if (entry.renews_on) dates.push(fill(h.renews, { date: ltr(entry.renews_on) }));
  if (entry.ended_at) dates.push(fill(h.ended, { date: ltr(viewerDate(entry.ended_at, tz)) }));
  const used = fill(h.used, { used: String(entry.lessons_used), total: String(entry.lessons_total) });
  return {
    heading: `${packageLabel(entry.package)} · ${statusLabel(entry.status)}`,
    dates,
    lessons: `${used} · ${fill(h.remaining, { n: String(entry.lessons_remaining) })}`,
    changes: entry.status_changes.map((c) => {
      const what = c.from ? fill(h.changed, { from: statusLabel(c.from), to: statusLabel(c.to) }) : fill(h.created, { to: statusLabel(c.to) });
      return `${ltr(viewerDate(c.at, tz))} — ${what}`;
    }),
    payments: entry.payments.map((p) => `${ltr(viewerDate(p.paid_at, tz))} — ${t.enums.paymentKind[p.kind]} — ${money(p.amount, p.currency)}`),
  };
}
