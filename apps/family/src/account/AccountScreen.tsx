import Constants from 'expo-constants';
import { View } from 'react-native';
import {
  AppearancePicker,
  AppText,
  InsetGroup,
  PasswordSection,
  SignOutButton,
  t,
  type,
  useMyProfile,
  useTheme,
} from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ownStudent, usePortalMe } from '@/portal';
import { ChildrenLinks } from './ChildrenLinks';
import { ProfileCard } from './ProfileCard';
import { PushSwitchRow } from './PushSwitchRow';

/**
 * «حسابي» (docs/50 §6, canvas Account / StudentAccount): the name, a guardian's children, this
 * phone's notifications, the appearance; a student also changes their password. Sign out last.
 */
export function AccountScreen() {
  const { color } = useTheme();
  const profile = useMyProfile();
  const me = usePortalMe().data;
  const own = me ? ownStudent(me) : null;
  const A = t.portal.app.account;
  const name = profile.data?.full_name ?? own?.name ?? '';
  const line = own ? A.student.replace('{code}', own.code) : A.guardian;
  const version = Constants.expoConfig?.version ?? '';
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.tabs.account} />}
      onRefresh={() => profile.refetch()}
    >
      <ProfileCard name={name} line={line} />
      {me && !own ? <ChildrenLinks students={me.students} /> : null}
      <View style={{ gap: 8 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}>
          {A.settings}
        </AppText>
        <InsetGroup>
          <PushSwitchRow hint={own ? A.pushStudent : A.pushGuardian} />
        </InsetGroup>
        <AppearancePicker />
      </View>
      {own ? <PasswordSection /> : null}
      <SignOutButton />
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink3, textAlign: 'center' }}>
        {A.version.replace('{v}', version)}
      </AppText>
    </FamilyPage>
  );
}
