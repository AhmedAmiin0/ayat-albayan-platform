import { backWithin } from '@/core/nav/back-within';
import { ScrollView } from 'react-native';
import {
  t,
  type,
  useTheme,
  AppText,
  BackButton,
  ErrorState,
  Screen,
  ScreenHeader,
  useMyProfile,
  PasswordSection,
} from '@ab/mobile-kit';
import { AccountSummary } from '@/account/components/AccountSummary';
import { AvatarSection } from '@/account/sections/AvatarSection';
import { EmailSection } from '@/account/sections/EmailSection';
import { NameSection } from '@/account/sections/NameSection';
import { PhoneSection } from '@/account/sections/PhoneSection';

export interface AccountScreenProps {
  /** The screen it was opened from, for back on a cold deep link. */
  home: '/more' | '/teacher/more' | '/sales/more' | '/assistant/more';
}

/** R-ACC-01..05: every signed-in role edits its own login here. */
export function AccountScreen({ home }: AccountScreenProps) {
  const { color } = useTheme();
  const profile = useMyProfile();
  const back = () => backWithin(home);
  const data = profile.data;
  return (
    <Screen>
      <ScreenHeader
        title={t.account.title}
        subtitle={t.account.subtitle}
        leading={<BackButton onPress={back} />}
      />
      {data ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <AccountSummary profile={data} />
          {/* Keyed by the user: a fresh profile after a save keeps what is typed in the other cards. */}
          <AvatarSection key={`avatar-${data.id}`} profile={data} />
          <NameSection key={`name-${data.id}`} profile={data} />
          <PhoneSection key={`phone-${data.id}`} profile={data} />
          <EmailSection key={`email-${data.id}`} profile={data} />
          <PasswordSection key={`password-${data.id}`} />
        </ScrollView>
      ) : profile.isError ? (
        <ErrorState message={t.account.loadError} onRetry={() => void profile.refetch()} />
      ) : (
        <AppText
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.body,
            lineHeight: type.lineHeight(type.size.body),
            color: color.ink2,
          }}
        >
          {t.account.loading}
        </AppText>
      )}
    </Screen>
  );
}
