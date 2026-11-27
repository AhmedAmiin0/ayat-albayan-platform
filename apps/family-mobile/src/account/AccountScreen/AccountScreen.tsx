import { AppText, PasswordSection, SignOutButton, t, type, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { accountCard } from '@/account/account-card';
import { AccountSettings } from '@/account/AccountSettings';
import { LegalLinks } from '@/account/LegalLinks';
import { ProfileCard } from '@/account/ProfileCard';
import { versionLine } from './account-screen.helpers';
import { useAccountScreen } from './use-account-screen';

export function AccountScreen() {
  const { color } = useTheme();
  const { profile, own, child } = useAccountScreen();
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
