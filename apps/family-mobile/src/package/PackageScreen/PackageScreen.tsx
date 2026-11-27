import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { PackageOf } from './PackageOf';
import { usePackageScreen } from './use-package-screen';

/** A child's own login never reads the package (anti-goal, docs/50 §4). */
export function PackageScreen() {
  const { id, me, refresh, title } = usePackageScreen();
  return (
    <FamilyPage header={<FamilyHeader title={title} back />} onRefresh={refresh}>
      <LoadState query={me}>{(data) => <PackageOf me={data} id={id} />}</LoadState>
    </FamilyPage>
  );
}
