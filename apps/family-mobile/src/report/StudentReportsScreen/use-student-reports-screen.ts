import { t } from '@ab/mobile-kit';
import { ownPage, useFamilyPick, usePickedChild, usePortalMe, useRefreshPortal } from '@/portal';

export function useStudentReportsScreen() {
  const me = usePortalMe();
  const pick = useFamilyPick();
  const child = usePickedChild();
  const refresh = useRefreshPortal();
  const R = t.portal.app;
  const one = pick.state === 'one' ? pick.student : null;
  const title = me.data && ownPage(me.data.kind, one) ? R.reports.title : R.tabs.reports;
  return { me, pick, child, refresh, title };
}
