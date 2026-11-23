import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState, t } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { FamilyHeader, FamilyPage } from '#/nav/index.ts';
import { studentOf, usePortalMe, useRefreshPortal } from '#/portal/index.ts';
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
  const student = studentOf(me.data, id);
  const money = Boolean(me.data && student && seesMoney(portalViewer(me.data.kind, student)));
  // No «الباقة» heading for a login that never sees money (a child's, through a stale link).
  const title =
    money && student ? `${t.portal.packageTab} · ${student.name}` : (student?.name ?? '');
  return (
    <FamilyPage header={<FamilyHeader title={title} back />} onRefresh={refresh}>
      <LoadState query={me}>{(data) => <PackageOf me={data} id={id} />}</LoadState>
    </FamilyPage>
  );
}
