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
import { ownStudent, usePortalMe } from '@/portal';
import { whoLine } from '@/profile';
import { AccountSettings } from './AccountSettings';
import { ProfileCard } from './ProfileCard';

/** «الإصدار 1.0.0». */
const versionLine = (): string =>
  t.portal.app.account.version.replace('{v}', Constants.expoConfig?.version ?? '');

/**
 * «حسابي» (docs/50 §6, canvas Account / StudentAccount): the card that opens the profile (where a
 * guardian's children are), this phone's notifications, the appearance; a student also changes
 * their password. Sign out last.
 */
export function AccountScreen() {
  const { color } = useTheme();
  const profile = useMyProfile();
  const me = usePortalMe().data;
  const own = me ? ownStudent(me) : null;
  const name = profile.data?.full_name ?? own?.name ?? '';
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.tabs.account} />}
      onRefresh={() => profile.refetch()}
    >
      <ProfileCard
        name={name}
        line={whoLine(own)}
        photo={profile.data?.avatar_url ?? null}
        seed={own?.id ?? null}
      />
      <AccountSettings student={own !== null} />
      {own ? <PasswordSection /> : null}
      <SignOutButton />
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink3, textAlign: 'center' }}>
        {versionLine()}
      </AppText>
    </FamilyPage>
  );
}
