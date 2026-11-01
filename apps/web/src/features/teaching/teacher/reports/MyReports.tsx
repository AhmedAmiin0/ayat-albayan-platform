import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { PendingReports } from '@/features/reporting/reports/history/PendingReports';
import { errorCode } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import type { ServerListPatch, ServerListSearch } from '@/lib/list/server-list-search';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { MyStudents } from '@/features/teaching/teacher/MyStudents';
import { SubmittedReports } from './SubmittedReports';

/**
 * /teacher/reports (R-REP-01/02/05, R-TCH-03): the reports still to write, the ones I sent (edit
 * while the window is open), and my students, each opening their «سجل التقارير».
 */
export interface MyReportsProps {
  /** The sent reports' page, sort and filters (route search, R-NFR-08). */
  search: ServerListSearch;
  onSearch: (patch: ServerListPatch) => void;
}

export function MyReports({ search, onSearch }: MyReportsProps) {
  const me = useQuery(teacherMeQuery);
  const viewer = useViewerTz();
  const tz = me.data?.tz ?? viewer;
  return (
    <>
      <PageHead>
        <Cartouche>{t.reports.title}</Cartouche>
      </PageHead>
      {me.isError && (
        <FormAlert>{errorCode(me.error) === 'teacher_not_linked' ? t.teacherDash.notLinked : t.teacherDash.loadError}</FormAlert>
      )}
      <PendingReports tz={tz} />
      <div className="grid gap-8">
        <SubmittedReports tz={tz} search={search} onSearch={onSearch} />
        {me.data && (
          <section aria-labelledby="my-students" className="grid gap-2">
            <h2 id="my-students" className="font-display text-h3 font-bold">
              {t.reports.history}
            </h2>
            <MyStudents students={me.data.students} showStatus={false} />
          </section>
        )}
      </div>
    </>
  );
}
