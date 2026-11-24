import Constants from 'expo-constants';
import {
  AppText,
  PasswordSection,
  SignOutButton,
  t,
  type,
  useMyProfile,
  useTheme,
} from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ownStudent, usePickedChild, usePortalMe } from '@/portal';
import { accountCard } from './account-card';
import { AccountSettings } from './AccountSettings';
import { LegalLinks } from './LegalLinks';
import { ProfileCard } from './ProfileCard';

const versionLine = (): string =>
  t.portal.app.account.version.replace('{v}', Constants.expoConfig?.version ?? '');

export function AccountScreen() {
  const { color } = useTheme();
  const profile = useMyProfile();
  const me = usePortalMe().data;
  const own = me ? ownStudent(me) : null;
  const child = usePickedChild();
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.tabs.account} child={child} />}
      onRefresh={() => profile.refetch()}
    >
      <ProfileCard {...accountCard(profile.data, own)} />
      <AccountSettings student={own !== null} />
      {own ? <PasswordSection /> : null}
      <LegalLinks />
      <SignOutButton />
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink3, textAlign: 'center' }}>
        {versionLine()}
      </AppText>
    </FamilyPage>
  );
}
