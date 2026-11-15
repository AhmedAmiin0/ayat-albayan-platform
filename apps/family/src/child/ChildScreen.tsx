import { useLocalSearchParams } from 'expo-router';
import { EmptyState, SkeletonCard, t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { studentOf, usePortalMe, useRefreshPortal } from '@/portal';
import { ChildBody } from './ChildBody';

/**
 * One child's page, `child/[id]` (docs/50 §6), pushed above the tabs (no tab bar under it): the
 * name and code, then the child's tabs. Pull to refresh reads every portal answer again.
 */
export function ChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  const student = studentOf(me.data, id);
  const title = student?.name ?? t.familyApp.child.title;
  return (
    <FamilyPage
      header={<FamilyHeader title={title} subtitle={student?.code} back />}
      onRefresh={refresh}
    >
      {student && me.data ? <ChildBody student={student} kind={me.data.kind} /> : null}
      {!student && me.data ? <EmptyState title={t.portal.noStudents} /> : null}
      {me.data ? null : <SkeletonCard />}
    </FamilyPage>
  );
}
