import { Redirect, router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { HomeBody } from './HomeBody';
import { childHref, ownStudent, usePortalMe } from './portal-me';

/**
 * The family app's home (docs/50 §6). A guardian: one card per child (name + code), pull to
 * refresh; a card opens the child's page. A student: straight to their own page (no list).
 */
export function FamilyHomeScreen() {
  const me = usePortalMe();
  const own = me.data ? ownStudent(me.data) : null;
  if (own) return <Redirect href={childHref(own.id)} />;
  return (
    <FamilyPage
      header={<FamilyHeader title={t.familyApp.home.title} settings />}
      onRefresh={() => me.refetch()}
    >
      <HomeBody
        data={me.data}
        isError={me.isError}
        onRetry={() => void me.refetch()}
        onOpen={(child) => router.push(childHref(child.id))}
      />
    </FamilyPage>
  );
}
