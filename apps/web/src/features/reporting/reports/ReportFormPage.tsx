import type { UserRole } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { reportErrorText, reportFormQuery } from './api';
import { reportHistoryHref } from './paths';
import { ReportEntry } from './entry/ReportEntry';
import { ReportEntryV2 } from './entry-v2/ReportEntryV2';
import { ReportLink } from './history/ReportLink';
import { AdminReportV2 } from './view-v2/AdminReportV2';

export interface ReportFormPageProps {
  lessonId: string;
  role: UserRole;
  /** Admin opens it from one student (the drawer); the teacher sees every student of the lesson. */
  studentId?: string;
}

function loadError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return t.common.forbidden;
  if (error instanceof ApiError && error.status === 404) return t.reports.error.lesson_not_found;
  return reportErrorText(error);
}

/**
 * «تقرير الحلقة» for one lesson (R-REP-01/02/04): opened from the lesson, identity prefilled. A
 * new-form report (form_version 2) is the new form for the teacher; the admin reads it and may edit it.
 */
export function ReportFormPage({ lessonId, role, studentId }: ReportFormPageProps) {
  const form = useQuery(reportFormQuery(lessonId));
  const viewer = useViewerTz();
  const head = (
    <PageHead>
      <Cartouche>{t.reports.formTitle}</Cartouche>
    </PageHead>
  );
  if (form.isError) return <>{head}<FormAlert>{loadError(form.error)}</FormAlert></>;
  if (!form.data) return <>{head}<ListSkeleton /></>;

  const data = form.data;
  const entries = studentId ? data.entries.filter((e) => e.student.id === studentId) : data.entries;
  const tz = role === 'admin' ? viewer : data.lesson.teacher.tz;
  if (entries.length === 0) return <>{head}<FormAlert>{t.common.notFound}</FormAlert></>;
  return (
    <>
      {head}
      <div className="grid gap-10">
        {entries.map((entry) => (
          <div key={entry.report.id} className="grid gap-3">
            {entry.report.form_version !== 2 ? (
              <ReportEntry form={data} entry={entry} titled={entries.length > 1} tz={tz} />
            ) : role === 'admin' ? (
              <AdminReportV2 form={data} entry={entry} titled={entries.length > 1} tz={tz} />
            ) : (
              <ReportEntryV2 form={data} entry={entry} titled={entries.length > 1} tz={tz} />
            )}
            <ReportLink href={reportHistoryHref(role, entry.student.id)} className="justify-self-start">
              {t.reports.history}
            </ReportLink>
          </div>
        ))}
      </div>
    </>
  );
}
