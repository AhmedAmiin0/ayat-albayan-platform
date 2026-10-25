import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { AccountSummary } from './AccountSummary';
import { AvatarSection } from './AvatarSection';
import { EmailSection } from './EmailSection';
import { NameSection } from './NameSection';
import { PasswordSection } from './PasswordSection';
import { PhoneSection } from './PhoneSection';
import { useMyProfile } from './queries';

export interface AccountScreenProps {
  /** The «المزيد» this screen was opened from, for «رجوع» on a cold deep link. */
  home: '/more' | '/teacher/more' | '/sales/more' | '/assistant/more';
}

/**
 * «حسابي» (R-ACC-01..05): every signed-in role edits its OWN login here: photo, name, phone,
 * email, password. Opened from «المزيد» (admin, sales and teacher shells).
 */
export function AccountScreen({ home }: AccountScreenProps) {
  const { color } = useTheme();
  const profile = useMyProfile();
  const back = () => (router.canGoBack() ? router.back() : router.replace(home));
  const data = profile.data;
  return (
    <Screen>
      <ScreenHeader
        title={t.account.title}
        subtitle={t.account.subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
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
          style={{ fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink2 }}
        >
          {t.account.loading}
        </AppText>
      )}
    </Screen>
  );
}
