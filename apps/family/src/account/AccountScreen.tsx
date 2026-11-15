import type { PortalHome, PortalStudent } from '@ab/shared';
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
import { AccountSettings } from './AccountSettings';
import { ChildrenLinks } from './ChildrenLinks';
import { ProfileCard } from './ProfileCard';

/** «طالب · رمز الطالب AB-2041» or «ولي أمر». */
const whoLine = (own: PortalStudent | null): string =>
  own ? t.portal.app.account.student.replace('{code}', own.code) : t.portal.app.account.guardian;

/** «الإصدار 1.0.0». */
const versionLine = (): string =>
  t.portal.app.account.version.replace('{v}', Constants.expoConfig?.version ?? '');

/** A guardian's children; none for a student. */
const childrenOf = (me: PortalHome | undefined, own: PortalStudent | null) =>
  own ? [] : (me?.students ?? []);

/**
 * «حسابي» (docs/50 §6, canvas Account / StudentAccount): the name, a guardian's children, this
 * phone's notifications, the appearance; a student also changes their password. Sign out last.
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
      <ProfileCard name={name} line={whoLine(own)} />
      <ChildrenLinks students={childrenOf(me, own)} />
      <AccountSettings student={own !== null} />
      {own ? <PasswordSection /> : null}
      <SignOutButton />
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink3, textAlign: 'center' }}>
        {versionLine()}
      </AppText>
    </FamilyPage>
  );
}
