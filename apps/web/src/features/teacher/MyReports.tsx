import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { PendingReports } from '@/features/reports/PendingReports';
import { errorCode } from '@/features/schedule/api';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { teacherMeQuery } from './api';
import { MyStudents } from './MyStudents';
import { SubmittedReports } from './SubmittedReports';

/**
 * /teacher/reports (R-REP-01/02/05, R-TCH-03): the reports still to write, the ones I sent (edit
 * while the window is open), and my students, each opening their «سجل التقارير».
 */
export function MyReports() {
  const me = useQuery(teacherMeQuery);
  const tz = me.data?.tz ?? RIYADH_TZ;
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
        <SubmittedReports tz={tz} />
        {me.data && (
          <section aria-labelledby="my-students" className="grid gap-2">
            <h2 id="my-students" className="font-display text-h3 font-bold">
              {t.reports.history}
            </h2>
            <MyStudents students={me.data.students} />
          </section>
        )}
      </div>
    </>
  );
}
