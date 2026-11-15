import type { PortalHome } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyPage, GreetingHeader } from '@/nav';
import { ownStudent, usePortalMe } from '@/portal';
import { GuardianHome } from './GuardianHome';
import { StudentHome } from './StudentHome';

/** A guardian's cards, or a student's own page; never the guardian's list for a student. */
function HomeOf({ me, onRetry }: { me: PortalHome; onRetry: () => void }) {
  const own = ownStudent(me);
  if (own) return <StudentHome student={own} />;
  return <GuardianHome me={me} isError={false} onRetry={onRetry} />;
}

/**
 * «الرئيسية» (docs/50 §6). A guardian: one card per child. A student: their own page, no list.
 * Until /portal/me answers, a neutral greeting and a skeleton (no «أبناؤك» for a student).
 */
export function HomeScreen() {
  const me = usePortalMe();
  if (me.data) return <HomeOf me={me.data} onRetry={() => void me.refetch()} />;
  return (
    <FamilyPage
      header={<GreetingHeader title={t.portal.app.home.greeting} />}
      onRefresh={() => me.refetch()}
    >
      <LoadState query={me}>{() => null}</LoadState>
    </FamilyPage>
  );
}
