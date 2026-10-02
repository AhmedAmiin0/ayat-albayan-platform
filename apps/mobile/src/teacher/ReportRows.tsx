import { gradeStyle, lessonWhenText, type PendingReportView, type TeacherReportView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';

// The rows of «التقارير». A row opens the lesson's report form (to write, edit or read it) or a
// student's history; the API decides what may still change (can_edit).

export const reportFormHref = (lessonId: string) => `/teacher/reports/${lessonId}`;

/** A started lesson still missing its sent report: «اكتب التقرير», or «تعديل التقرير» for a draft. */
export function PendingReportRow({ row, tz }: { row: PendingReportView; tz: string }) {
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={lessonWhenText(new Date(row.starts_at), tz, locale)}
      trailing={<StatusChip tone="act" glyph="hollow" label={row.report_id ? t.reports.edit : t.reports.open} size="sm" />}
      onPress={() => router.push(reportFormHref(row.lesson_id))}
    />
  );
}

/** A sent report: when, the overall grade (or the attendance), and edit while its window is open. */
export function SubmittedReportRow({ row, tz }: { row: TeacherReportView; tz: string }) {
  const when = lessonWhenText(new Date(row.starts_at), tz, locale);
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
}

/** One of my students: their «سجل التقارير». */
export function StudentHistoryRow({ student }: { student: { id: string; code: string; name: string } }) {
  return (
    <ListRow
      title={student.name}
      meta={student.code}
      subtitle={t.reports.history}
      onPress={() => router.push(`/teacher/reports/student/${student.id}`)}
    />
  );
}
