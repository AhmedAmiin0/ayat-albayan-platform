import { EmptyState, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useFamilyPick, usePortalMe, useRefreshPortal } from '@/portal';
import { OwnReports } from './OwnReports';

/**
 * «التقارير» (canvas Reports): the sent reports of the student in view, newest first, by month;
 * «تقاريري» for a student's own. The tab shows only once that student is known (familyTabs).
 */
export function StudentReportsScreen() {
  const me = usePortalMe();
  const pick = useFamilyPick();
  const refresh = useRefreshPortal();
  const R = t.portal.app;
  const title = me.data?.kind === 'student' ? R.reports.title : R.tabs.reports;
  return (
    <FamilyPage header={<FamilyHeader title={title} />} onRefresh={refresh}>
      <LoadState query={me}>
        {() =>
          pick.state === 'one' ? (
            <OwnReports key={pick.student.id} student={pick.student} />
          ) : (
            <EmptyState title={t.portal.noStudents} />
          )
        }
      </LoadState>
    </FamilyPage>
  );
}
