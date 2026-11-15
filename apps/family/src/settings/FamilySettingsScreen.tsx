import {
  useMyProfile,
  t,
  BiometricSwitchRow,
  ListRow,
  InsetGroup,
  SignOutButton,
} from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
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
      <BiometricSwitchRow />
      <SignOutButton />
    </FamilyPage>
  );
}
