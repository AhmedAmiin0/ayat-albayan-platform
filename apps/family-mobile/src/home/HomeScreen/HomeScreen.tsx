import { EmptyState, SkeletonCard, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyPage, GreetingHeader } from '@/nav';
import { StudentHome } from '@/home/StudentHome';
import { useHomeScreen } from './use-home-screen';

export function HomeScreen() {
  const { me, pick, kind } = useHomeScreen();
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
