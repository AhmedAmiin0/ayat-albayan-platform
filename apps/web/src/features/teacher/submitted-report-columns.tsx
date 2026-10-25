import { ATTENDANCES, GRADES, gradeStyle, lessonWhenText, type TeacherReportView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { reportFormHref } from '@/features/reports/paths';
import { PdfAction } from '@/features/reports/PdfAction';
import { ReportLink } from '@/features/reports/ReportLink';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

const col = createColumnHelper<DataTableFeatures, TeacherReportView>();
const attendanceOptions = ATTENDANCES.map((a) => ({ value: a, label: t.enums.attendance[a] }));
const gradeOptions = GRADES.map((g) => ({ value: g, label: t.enums.grade[g] }));
const when = (iso: string, tz: string) => lessonWhenText(new Date(iso), tz, locale);

/**
 * «تقارير مُرسلة» columns (server sort/filter, R-NFR-08): student (name or code search), the lesson,
 * when it was sent (sorts), attendance and grade (sort + select), then edit/view and the PDF. The
 * lesson date has no sort (lesson_reports has no FK to lessons); the default order is newest sent.
 */
export function submittedReportColumns(tz: string) {
  return col.columns([
    col.accessor((r) => r.student.name, {
      id: 'student',
      header: () => t.reports.studentCol,
      cell: (c) => (
        <span className="inline-flex flex-wrap items-baseline gap-x-3">
          <span className="font-semibold">{c.getValue()}</span>
          <Ltr className="text-xs text-ink-3">{c.row.original.student.code}</Ltr>
        </span>
      ),
      meta: { className: 'max-sm:order-1', filter: { kind: 'text' } },
    }),
    col.accessor('starts_at', {
      header: () => t.reports.date,
      cell: (c) => <span className="text-sm text-ink-2">{when(c.getValue(), tz)}</span>,
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor('submitted_at', {
      header: () => t.reports.submittedAtCol,
      cell: (c) => {
        const at = c.getValue();
        return at ? <span className="text-xs text-ink-3">{when(at, tz)}</span> : '—';
      },
      meta: { className: 'max-sm:hidden', sortKey: 'submitted' },
    }),
    col.accessor('attendance', {
      header: () => t.reports.attendance,
      cell: (c) => {
        const a = c.getValue();
        return a ? <span className="text-sm text-ink-2">{t.enums.attendance[a]}</span> : '—';
      },
      meta: { className: 'max-sm:order-3', sortKey: 'attendance', filter: { kind: 'select', options: attendanceOptions } },
    }),
    col.accessor('grade_overall', {
      id: 'grade',
      header: () => t.reports.gradeCol,
      cell: (c) => {
        const g = c.getValue();
        return g ? <StatusChip {...gradeStyle[g]} size="sm" label={`${t.reports.overall}: ${t.enums.grade[g]}`} /> : '—';
      },
      meta: { className: 'max-sm:order-4', sortKey: 'grade', filter: { kind: 'select', options: gradeOptions } },
    }),
    col.display({
      id: 'actions',
      header: () => t.reports.actionsCol,
      cell: (c) => {
        const r = c.row.original;
        const until = r.can_edit && r.edit_until ? t.reports.editUntil.replace('{when}', when(r.edit_until, tz)) : null;
        return (
          <span className="grid justify-items-start gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <ReportLink href={reportFormHref({ role: 'teacher', lessonId: r.lesson_id, studentId: r.student.id })}>
                {r.can_edit ? t.reports.edit : t.reports.view}
              </ReportLink>
              <PdfAction report={r} role="teacher" />
            </span>
            {until && <span className="text-xs whitespace-normal text-ink-3">{until}</span>}
          </span>
        );
      },
      meta: { className: 'max-sm:order-5 max-sm:basis-full' },
    }),
  ]);
}
