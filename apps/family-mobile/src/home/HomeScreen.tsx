import { EmptyState, SkeletonCard, t } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { FamilyPage, GreetingHeader } from '#/nav/index.ts';
import { useFamilyPick, usePortalMe } from '#/portal/index.ts';
import { StudentHome } from './StudentHome';

/**
 * «الرئيسية» (docs/50 §6): the page of the student in view, a student's own or the child a
 * guardian works as (only or picked; the picker itself is the tabs' redirect). Until that student
 * is known, a neutral greeting over a skeleton; no student linked: the note.
 */
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
