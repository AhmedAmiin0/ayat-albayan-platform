import type { UserRole } from '@ab/catalog';
import { useQuery } from '@tanstack/react-query';
import {
  Cartouche,
  FormAlert,
  PageHead,
  ListSkeleton,
  ApiError,
  t,
  useViewerTz,
} from '@ab/web-kit';
import { reportErrorText, reportFormQuery } from '@/features/reporting/reports/api';
import { reportHistoryHref } from '@/features/reporting/reports/paths';
import { ReportLink } from '@/features/reporting/reports/history/ReportLink';
import { ReportEntryForm } from '@/features/reporting/reports/ReportEntryForm';

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

/** Opened from the lesson (R-REP-01/02/04); form version 2 is editable by the teacher and admin. */
export function ReportFormPage({ lessonId, role, studentId }: ReportFormPageProps) {
  const form = useQuery(reportFormQuery(lessonId));
  const viewer = useViewerTz();
  const head = (
    <PageHead>
      <Cartouche>{t.reports.formTitle}</Cartouche>
    </PageHead>
  );
  // A failed background refetch (the close-time one) keeps the loaded form (review 11-11).
  if (form.isError && !form.data) return <>{head}<FormAlert>{loadError(form.error)}</FormAlert></>;
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
            <ReportEntryForm form={data} entry={entry} role={role}
              titled={entries.length > 1} tz={tz} />
            <ReportLink href={reportHistoryHref(role, entry.student.id)} className="justify-self-start">
              {t.reports.history}
            </ReportLink>
          </div>
        ))}
      </div>
    </>
  );
}
