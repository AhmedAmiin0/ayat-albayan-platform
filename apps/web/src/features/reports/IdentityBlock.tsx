import { lessonWhenText, packageProgress, type ReportFormEntry, type ReportFormLesson } from '@ab/shared';
import type { ReactNode } from 'react';
import { Ltr } from '@/components/ui/display/ltr';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { teacherLabel } from '@/lib/i18n/teacher-label';

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
 * The read-only top of the report (R-REP-01, issue D1), in the form's order: «معرّف الطالب», the
 * teacher, the student, the date in the student's zone and the lesson number. They come from the
 * lesson, never typed. «البرنامج» and «الحضور» (editable) follow, then the link (MeetingLinkRow).
 */
export function IdentityBlock({ lesson, entry }: { lesson: ReportFormLesson; entry: ReportFormEntry }) {
  const { student } = entry;
  const when = `${lessonWhenText(new Date(lesson.starts_at), student.tz, locale)} (${tzCity(student.tz) ?? student.tz})`;
  return (
    <div className="grid gap-2 border-y border-rule bg-sunk/60 px-3 py-3">
      <p className="text-xs text-ink-3">{t.reports.readOnlyHint}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Row label={t.reports.studentId}>
          <Ltr className="font-semibold">{student.code}</Ltr>
        </Row>
        <Row label={t.reports.teacher}>{teacherLabel(lesson.teacher)}</Row>
        <Row label={t.reports.student}>
          <span className="font-semibold">{student.name}</span>
        </Row>
        <Row label={t.reports.date}>{when}</Row>
        <Row label={t.reports.lessonNo}>{lessonNo(entry)}</Row>
      </dl>
    </div>
  );
}

/** «رابط الاجتماع»: the lesson's link, read-only (it lives on the lesson), after the attendance. */
export function MeetingLinkRow({ lesson }: { lesson: ReportFormLesson }) {
  return (
    <dl>
      <Row label={t.reports.link}>
        {lesson.meeting_link ? (
          <a href={lesson.meeting_link} target="_blank" rel="noreferrer" dir="ltr" className="block truncate py-3 text-lapis underline underline-offset-4 sm:py-0">
            {lesson.meeting_link.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span className="text-ink-3">{t.lessons.noLink}</span>
        )}
      </Row>
    </dl>
  );
}
