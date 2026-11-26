import { memo } from 'react';
import type { PendingReportView, ReportSummaryView, TeacherReportView } from '@ab/shared';
import { gradeStyle } from '@ab/money';
import { editableNow } from '@ab/client-core';
import { router } from 'expo-router';
import { t, Button, ListRow, StatusChip, useNow } from '@ab/mobile-kit';
import { useClockCycle, whenIn } from '@/core/lib/clock';

// The API decides what may still change (can_edit).

export const reportFormHref = (lessonId: string) => `/teacher/reports/${lessonId}`;

export const PendingReportRow = memo(function PendingReportRow({
  row,
  tz,
}: {
  row: PendingReportView;
  tz: string;
}) {
  const cycle = useClockCycle();
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={whenIn(new Date(row.starts_at), tz, cycle)}
      trailing={<StatusChip tone="act" glyph="hollow" label={row.report_id ? t.reports.resume : t.reports.open} size="sm" />}
      onPress={() => router.push(reportFormHref(row.lesson_id))}
    />
  );
});

/**
 * A sent report: when, the overall grade (or the attendance), and edit while its window is open on
 * this clock (editableNow, docs/46 B5: not the cached can_edit, so a list left open never offers a
 * closed edit).
 */
export const SubmittedReportRow = memo(function SubmittedReportRow({
  row,
  tz,
}: {
  row: TeacherReportView;
  tz: string;
}) {
  const cycle = useClockCycle();
  const editable = editableNow(row, useNow());
  const when = whenIn(new Date(row.starts_at), tz, cycle);
  const grade = row.grade_overall
    ? t.enums.grade[row.grade_overall]
    : row.attendance
      ? t.enums.attendance[row.attendance]
      : null;
  const tone = row.grade_overall ? gradeStyle[row.grade_overall].tone : 'neutral';
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={grade ? `${when} · ${grade}` : when}
      trailing={
        <StatusChip
          tone={editable ? tone : 'neutral'}
          glyph={editable ? 'half' : 'fill'}
          label={editable ? t.reports.edit : t.reports.view}
          size="sm"
        />
      }
      onPress={() => router.push(reportFormHref(row.lesson_id))}
    />
  );
});

export const StudentHistoryRow = memo(function StudentHistoryRow({
  student,
}: {
  student: { id: string; code: string; name: string };
}) {
  return (
    <ListRow
      title={student.name}
      meta={student.code}
      subtitle={t.reports.history}
      onPress={() => router.push(`/teacher/reports/student/${student.id}`)}
    />
  );
});

/** The lesson number, then the overall grade or, without grades, the attendance. */
function summaryLine(r: ReportSummaryView): string {
  const no =
    r.lesson_no === null ? null : t.reports.lessonNoShort.replace('{n}', String(r.lesson_no));
  const grade = r.grade_overall
    ? t.enums.grade[r.grade_overall]
    : r.attendance
      ? t.enums.attendance[r.attendance]
      : null;
  return [no, grade].filter((part): part is string => part !== null).join(' · ');
}

interface ReportHistoryRowProps {
  row: ReportSummaryView;
  tz: string;
  /** Shown once the PDF is ready. */
  onPdf: () => void;
  /** Opens the report (the teacher's own lesson, the admin); without it the row is a history line. */
  onPress?: () => void;
}

/** Read-only for sales. */
export const ReportHistoryRow = memo(function ReportHistoryRow({
  row,
  tz,
  onPdf,
  onPress,
}: ReportHistoryRowProps) {
  const cycle = useClockCycle();
  return (
    <ListRow
      title={whenIn(new Date(row.starts_at), tz, cycle)}
      subtitle={summaryLine(row)}
      trailing={row.pdf_status === 'ready' ? <Button variant="ghost" label={t.reports.downloadPdf} onPress={onPdf} /> : undefined}
      onPress={onPress}
    />
  );
});
