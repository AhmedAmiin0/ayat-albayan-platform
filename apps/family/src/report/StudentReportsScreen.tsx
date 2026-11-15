import { SkeletonCard, t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ownStudent, usePortalMe, useRefreshPortal } from '@/portal';
import { OwnReports } from './OwnReports';

/** «تقاريري» (a student's tab, canvas Reports): their own sent reports, newest first, by month. */
export function StudentReportsScreen() {
  const me = usePortalMe();
  const student = me.data ? ownStudent(me.data) : null;
  const refresh = useRefreshPortal();
  return (
    <FamilyPage header={<FamilyHeader title={t.portal.app.reports.title} />} onRefresh={refresh}>
      {student ? <OwnReports student={student} /> : <SkeletonCard />}
    </FamilyPage>
  );
}
