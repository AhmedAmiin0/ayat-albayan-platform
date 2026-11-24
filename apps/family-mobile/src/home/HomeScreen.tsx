import { EmptyState, SkeletonCard, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyPage, GreetingHeader } from '@/nav';
import { useFamilyPick, usePortalMe } from '@/portal';
import { StudentHome } from './StudentHome';

export function HomeScreen() {
  const me = usePortalMe();
  const pick = useFamilyPick();
  const kind = me.data?.kind;
  if (kind && pick.state === 'one') {
    // A new pick starts on its own first tab.
    return <StudentHome key={pick.student.id} student={pick.student} kind={kind} />;
  }
  return (
    <FamilyPage
      header={<GreetingHeader title={t.portal.app.home.greeting} />}
      onRefresh={() => me.refetch()}
    >
      <LoadState query={me}>
        {() =>
          pick.state === 'empty' ? <EmptyState title={t.familyApp.home.empty} /> : <SkeletonCard />
        }
      </LoadState>
    </FamilyPage>
  );
}
