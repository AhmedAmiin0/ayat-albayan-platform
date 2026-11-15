import type { PortalHome } from '@ab/shared';
import { EmptyState, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ownStudent, usePortalMe, useRefreshPortal } from '@/portal';
import { OwnReports } from './OwnReports';

function ReportsOf({ me }: { me: PortalHome }) {
  const student = ownStudent(me);
  if (!student) return <EmptyState title={t.portal.noStudents} />;
  return <OwnReports student={student} />;
}

/** «تقاريري» (a student's tab, canvas Reports): their own sent reports, newest first, by month. */
export function StudentReportsScreen() {
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  return (
    <FamilyPage header={<FamilyHeader title={t.portal.app.reports.title} />} onRefresh={refresh}>
      <LoadState query={me}>{(data) => <ReportsOf me={data} />}</LoadState>
    </FamilyPage>
  );
}
