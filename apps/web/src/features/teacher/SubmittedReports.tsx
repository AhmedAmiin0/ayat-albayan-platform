import { gradeStyle, lessonWhenText, type TeacherReportView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { Ltr } from '@/components/ui/ltr';
import { Pager } from '@/components/ui/pager';
import { StatusChip } from '@/components/ui/status-chip';
import { reportFormHref } from '@/features/reports/paths';
import { PdfAction } from '@/features/reports/PdfAction';
import { ReportLink } from '@/features/reports/ReportLink';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { myReportsQuery } from './api';

/**
 * «تقارير اتبعتت» (R-REP-02, R-TCH-03): my sent reports, newest first, paged. Inside the edit
 * window «تعديل التقرير» with its deadline, after it «عرض التقرير»; the PDF once it is ready.
 */
export function SubmittedReports({ tz }: { tz: string }) {
  const [page, setPage] = useState(1);
  const list = useQuery(myReportsQuery(page));
  return (
    <section aria-labelledby="submitted-reports" className="grid gap-2">
      <h2 id="submitted-reports" className="font-display text-h3 font-bold">
        {t.reports.submittedTitle}
      </h2>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {list.data?.items.length === 0 && <EmptyState title={t.reports.noSubmitted} />}
      {list.data && list.data.items.length > 0 && (
        <>
          <ol className="grid border-t-[3px] border-double border-gold">
            {list.data.items.map((r) => (
              <Row key={r.id} report={r} tz={tz} />
            ))}
          </ol>
          <Pager page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />
        </>
      )}
    </section>
  );
}

function Row({ report: r, tz }: { report: TeacherReportView; tz: string }) {
  const until = r.can_edit && r.edit_until ? t.reports.editUntil.replace('{when}', lessonWhenText(new Date(r.edit_until), tz, locale)) : null;
  return (
    <li className="grid gap-2 border-b border-rule py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-1">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-semibold">{r.student.name}</span>
          <Ltr className="text-xs text-ink-3">{r.student.code}</Ltr>
          <span className="text-sm text-ink-2">{lessonWhenText(new Date(r.starts_at), tz, locale)}</span>
        </p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          {r.attendance && <span>{t.enums.attendance[r.attendance]}</span>}
          {r.grade_overall && (
            <StatusChip {...gradeStyle[r.grade_overall]} size="sm" label={`${t.reports.overall}: ${t.enums.grade[r.grade_overall]}`} />
          )}
        </p>
        {until && <p className="text-xs text-ink-3">{until}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ReportLink href={reportFormHref({ role: 'teacher', lessonId: r.lesson_id, studentId: r.student.id })}>
          {r.can_edit ? t.reports.edit : t.reports.view}
        </ReportLink>
        <PdfAction report={r} role="teacher" />
      </div>
    </li>
  );
}
