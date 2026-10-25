import type { UserRole } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { reportErrorText, reportFormQuery } from './api';
import { reportHistoryHref } from './paths';
import { ReportEntry } from './ReportEntry';
import { ReportLink } from './ReportLink';

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

/** «تقرير الحلقة» for one lesson (R-REP-01/02/04): opened from the lesson, identity prefilled. */
export function ReportFormPage({ lessonId, role, studentId }: ReportFormPageProps) {
  const form = useQuery(reportFormQuery(lessonId));
  const head = (
    <PageHead>
      <Cartouche>{t.reports.formTitle}</Cartouche>
    </PageHead>
  );
  if (form.isError) return <>{head}<FormAlert>{loadError(form.error)}</FormAlert></>;
  if (!form.data) return <>{head}<ListSkeleton /></>;

  const data = form.data;
  const entries = studentId ? data.entries.filter((e) => e.student.id === studentId) : data.entries;
  const tz = role === 'admin' ? RIYADH_TZ : data.lesson.teacher.tz;
  if (entries.length === 0) return <>{head}<FormAlert>{t.common.notFound}</FormAlert></>;
  return (
    <>
      {head}
      <div className="grid gap-10">
        {entries.map((entry) => (
          <div key={entry.report.id} className="grid gap-3">
            <ReportEntry form={data} entry={entry} titled={entries.length > 1} tz={tz} />
            <ReportLink href={reportHistoryHref(role, entry.student.id)} className="justify-self-start">
              {t.reports.history}
            </ReportLink>
          </div>
        ))}
      </div>
    </>
  );
}
