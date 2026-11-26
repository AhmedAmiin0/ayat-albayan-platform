import type { PortalHome } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { studentOf, usePortalMe, useRefreshPortal } from '@/portal';
import { ChildBody } from '@/child/ChildBody';

/** The child's tabs, or the «not linked» note for an id that is not this login's. */
function ChildOf({ me, id }: { me: PortalHome; id: string }) {
  const student = studentOf(me, id);
  if (!student) return <EmptyState title={t.portal.noStudents} />;
  return <ChildBody student={student} kind={me.kind} />;
}

/**
 * One child's page, `child/[id]` (docs/50 §6), pushed above the tabs (no tab bar under it): the
 * name and code, then the child's tabs. Pull to refresh reads every portal answer again.
 */
export function ChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  const student = studentOf(me.data, id);
  return (
    <FamilyPage
      header={
        <FamilyHeader
          title={student?.name ?? t.familyApp.child.title}
          subtitle={student?.code}
          back
        />
      }
      onRefresh={refresh}
    >
      <LoadState query={me}>{(data) => <ChildOf me={data} id={id} />}</LoadState>
    </FamilyPage>
  );
}
