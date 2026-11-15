import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState, t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage, LoadState } from '@/nav';
import { studentOf, usePortalMe, useRefreshPortal } from '@/portal';
import { PackageBody } from './PackageBody';

/** The package of a student whose login sees money; else the note, and no request is made. */
function PackageOf({ me, id }: { me: PortalHome; id: string }) {
  const student = studentOf(me, id);
  const money = student !== null && seesMoney(portalViewer(me.kind, student));
  if (!student || !money) return <EmptyState title={t.portal.packageEmpty} />;
  return <PackageBody student={student} />;
}

/**
 * «الباقة» pushed above the tabs (from the home card or a bell row), `package/[id]`. A child's own
 * login never reads it (anti-goal, docs/50 §4).
 */
export function PackageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  const name = studentOf(me.data, id)?.name;
  const title = name ? `${t.portal.packageTab} · ${name}` : t.portal.packageTab;
  return (
    <FamilyPage header={<FamilyHeader title={title} back />} onRefresh={refresh}>
      <LoadState query={me}>{(data) => <PackageOf me={data} id={id} />}</LoadState>
    </FamilyPage>
  );
}
