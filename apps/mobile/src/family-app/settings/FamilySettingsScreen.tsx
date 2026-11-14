import { useMyProfile } from '@/account';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';
import { FamilyHeader } from '@/family-app/nav/FamilyHeader';
import { FamilyPage } from '@/family-app/nav/FamilyPage';
import { SignOutButton } from '@/core/auth';
import { PushSwitchRow } from './PushSwitchRow';

/**
 * The family app's «الإعدادات» (docs/50 §6): the signed-in name (GET /me/profile), this device's
 * notifications switch, and «تسجيل الخروج» (the token off the profile first, then the session).
 */
export function FamilySettingsScreen() {
  const profile = useMyProfile();
  return (
    <FamilyPage
      header={<FamilyHeader title={t.familyApp.settings.title} back />}
      onRefresh={() => profile.refetch()}
    >
      <InsetGroup>
        <ListRow title={t.familyApp.settings.name} subtitle={profile.data?.full_name} />
        <PushSwitchRow />
      </InsetGroup>
      <SignOutButton />
    </FamilyPage>
  );
}
