import { useLocalSearchParams } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { usePortalMe } from '@/family-app/home/portal-me';
import { FamilyHeader } from '@/family-app/nav/FamilyHeader';
import { FamilyPage } from '@/family-app/nav/FamilyPage';

/**
 * One child's page, `child/[id]` (docs/50 §6). The shell's placeholder: the seam the next PR fills
 * with the tabs «القادمة» / «حضرها» / «غاب عنها» / «الباقة». A guardian came from home («رجوع»);
 * a student lands here directly, so their page carries «الإعدادات» instead.
 */
export function ChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const child = me.data?.students.find((s) => s.id === id);
  const own = me.data?.kind === 'student';
  const title = child?.name ?? t.familyApp.child.title;
  return (
    <FamilyPage
      header={<FamilyHeader title={title} back={!own} settings={own} />}
      onRefresh={() => me.refetch()}
    >
      <EmptyState title={t.familyApp.child.soon} />
    </FamilyPage>
  );
}
