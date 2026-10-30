import { memo } from 'react';
import { gradeStyle, type PendingReportView, type ReportSummaryView, type TeacherReportView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useClockCycle, whenIn } from '@/core/lib/clock';

// The rows of «التقارير». A row opens the lesson's report form (to write, edit or read it) or a
// student's history; the API decides what may still change (can_edit).

export const reportFormHref = (lessonId: string) => `/teacher/reports/${lessonId}`;

/** A started lesson still missing its sent report: «اكتب التقرير», or «تعديل التقرير» for a draft. */
export const PendingReportRow = memo(function PendingReportRow({ row, tz }: { row: PendingReportView; tz: string }) {
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

/** A sent report: when, the overall grade (or the attendance), and edit while its window is open. */
export const SubmittedReportRow = memo(function SubmittedReportRow({ row, tz }: { row: TeacherReportView; tz: string }) {
  const cycle = useClockCycle();
  const when = whenIn(new Date(row.starts_at), tz, cycle);
  const grade = row.grade_overall ? t.enums.grade[row.grade_overall] : row.attendance ? t.enums.attendance[row.attendance] : null;
  const tone = row.grade_overall ? gradeStyle[row.grade_overall].tone : 'neutral';
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={grade ? `${when} · ${grade}` : when}
      trailing={
        <StatusChip
          tone={row.can_edit ? tone : 'neutral'}
          glyph={row.can_edit ? 'half' : 'fill'}
          label={row.can_edit ? t.reports.edit : t.reports.view}
          size="sm"
        />
      }
      onPress={() => router.push(reportFormHref(row.lesson_id))}
    />
  );
});

/** One of my students: their «سجل التقارير». */
export const StudentHistoryRow = memo(function StudentHistoryRow({ student }: { student: { id: string; code: string; name: string } }) {
  return (
    <ListRow
      title={student.name}
      meta={student.code}
      subtitle={t.reports.history}
      onPress={() => router.push(`/teacher/reports/student/${student.id}`)}
    />
  );
});

/** «الحلقة 12 · ممتاز»: the lesson number, then the overall grade or, without grades, the attendance. */
function summaryLine(r: ReportSummaryView): string {
  const no = r.lesson_no === null ? null : t.reports.lessonNoShort.replace('{n}', String(r.lesson_no));
  const grade = r.grade_overall ? t.enums.grade[r.grade_overall] : r.attendance ? t.enums.attendance[r.attendance] : null;
  return [no, grade].filter((part): part is string => part !== null).join(' · ');
}

interface ReportHistoryRowProps {
  row: ReportSummaryView;
  tz: string;
  /** «تحميل PDF», shown once the PDF is ready. */
  onPdf: () => void;
  /** Opens the report (the teacher's own lesson, the admin); without it the row is a history line. */
  onPress?: () => void;
}

/** One sent report of a student's «سجل التقارير» (teacher, admin, and sales' «تفاصيل الطالب» read-only). */
export const ReportHistoryRow = memo(function ReportHistoryRow({ row, tz, onPdf, onPress }: ReportHistoryRowProps) {
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
