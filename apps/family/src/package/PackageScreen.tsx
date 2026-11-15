import { portalViewer, seesMoney } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState, SkeletonCard, t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { studentOf, usePortalMe, useRefreshPortal } from '@/portal';
import { PackageBody } from './PackageBody';

/**
 * «الباقة» pushed above the tabs (from the home card or a bell row), `package/[id]`. A child's own
 * login never reads it (anti-goal, docs/50 §4): it gets the «no package» note, no request.
 */
export function PackageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  const student = studentOf(me.data, id);
  const money = Boolean(me.data && student && seesMoney(portalViewer(me.data.kind, student)));
  const title = student ? `${t.portal.packageTab} · ${student.name}` : t.portal.packageTab;
  return (
    <FamilyPage header={<FamilyHeader title={title} back />} onRefresh={refresh}>
      {student && money ? <PackageBody student={student} /> : null}
      {me.data && !money ? <EmptyState title={t.portal.packageEmpty} /> : null}
      {me.data ? null : <SkeletonCard />}
    </FamilyPage>
  );
}
