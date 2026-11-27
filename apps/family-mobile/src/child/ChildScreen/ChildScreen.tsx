import { t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ChildOf } from './ChildOf';
import { useChildScreen } from './use-child-screen';

/**
 * One child's page, `child/[id]` (docs/50 §6), pushed above the tabs (no tab bar under it): the
 * name and code, then the child's tabs. Pull to refresh reads every portal answer again.
 */
export function ChildScreen() {
  const { id, me, refresh, student } = useChildScreen();
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
