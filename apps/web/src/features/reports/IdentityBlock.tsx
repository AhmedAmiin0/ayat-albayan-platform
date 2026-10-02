import { lessonWhenText, packageProgress, type ReportFormEntry, type ReportFormLesson } from '@ab/shared';
import type { ReactNode } from 'react';
import { Ltr } from '@/components/ui/ltr';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{children}</dd>
    </div>
  );
}

/** «رقم الحلقة» (R-LES-03), with the package line when the student has one (R-SUB-03). */
function lessonNo(entry: ReportFormEntry): string {
  if (!entry.package) return String(entry.lesson_no);
  const { lessons_used, lessons_total } = entry.package;
  const left = packageProgress(lessons_used, lessons_total, { forms: t.subscriptions.progress });
  return `${entry.lesson_no} · ${left.remainingLabel}`;
}

/**
 * The read-only identity of the report (R-REP-01, issue D1): student, teacher, date in the
 * student's zone, lesson number, program and link come from the lesson, never typed.
 */
export function IdentityBlock({ lesson, entry }: { lesson: ReportFormLesson; entry: ReportFormEntry }) {
  const { student } = entry;
  const when = `${lessonWhenText(new Date(lesson.starts_at), student.tz)} (${tzCity(student.tz) ?? student.tz})`;
  return (
    <section aria-label={t.reports.identity} className="grid gap-2 border-y border-rule bg-sunk/60 px-3 py-3">
      <p className="text-xs text-ink-3">{t.reports.readOnlyHint}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Row label={t.reports.student}>
          <span className="me-2 font-semibold">{student.name}</span>
          <Ltr className="text-xs text-ink-3">{student.code}</Ltr>
        </Row>
        <Row label={t.reports.teacher}>{lesson.teacher.display_name_ar}</Row>
        <Row label={t.reports.date}>{when}</Row>
        <Row label={t.reports.lessonNo}>{lessonNo(entry)}</Row>
        <Row label={t.reports.program}>{t.enums.program[student.program]}</Row>
        <Row label={t.reports.link}>
          {lesson.meeting_link ? (
            <a href={lesson.meeting_link} target="_blank" rel="noreferrer" dir="ltr" className="block truncate text-lapis underline underline-offset-4">
              {lesson.meeting_link.replace(/^https?:\/\//, '')}
            </a>
          ) : (
            <span className="text-ink-3">{t.lessons.noLink}</span>
          )}
        </Row>
      </dl>
    </section>
  );
}
