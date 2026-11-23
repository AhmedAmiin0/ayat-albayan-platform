import { EmptyState, t } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { FamilyHeader, FamilyPage } from '#/nav/index.ts';
import { ownPage, useFamilyPick, usePickedChild, usePortalMe, useRefreshPortal } from '#/portal/index.ts';
import { OwnReports } from './OwnReports';

/**
 * «التقارير» (canvas Reports): the sent reports of the student in view, newest first, by month;
 * «تقاريري» for a student's own, the child switch under the title for a guardian of
 * several. The tab shows only once that student is known (familyTabs).
 */
export function StudentReportsScreen() {
  const me = usePortalMe();
  const pick = useFamilyPick();
  const child = usePickedChild();
  const refresh = useRefreshPortal();
  const R = t.portal.app;
  const one = pick.state === 'one' ? pick.student : null;
  const title = me.data && ownPage(me.data.kind, one) ? R.reports.title : R.tabs.reports;
  return (
    <FamilyPage header={<FamilyHeader title={title} child={child} />} onRefresh={refresh}>
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
