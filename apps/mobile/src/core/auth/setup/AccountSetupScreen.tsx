import { ScrollView } from 'react-native';
import { signOutDevice } from '@/core/lib/session/sign-out';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { SetupFields } from './SetupFields';

const S = t.teacherAuth.setup;

/**
 * «أكمل حسابك» (docs/46 A4, A8): the teacher tree shows this instead of her tabs while her login is
 * the one a WhatsApp code made. One column like the login screen; «تسجيل الخروج» leaves.
 */
export function AccountSetupScreen() {
  const { color } = useTheme();
  const title = type.lineHeight(type.size.h2, true);
  return (
    <KeyboardFrame inScreen={false} style={{ flex: 1, backgroundColor: color.margin }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <AppText
          accessibilityRole="header"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h2,
            lineHeight: title,
            color: color.ink,
            textAlign: 'center',
          }}
        >
          {S.title}
        </AppText>
        <AppText
          style={{
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.ink2,
          }}
        >
          {S.intro}
        </AppText>
        <SetupFields />
        <Button variant="ghost" label={S.signOut} onPress={() => void signOutDevice()} />
      </ScrollView>
    </KeyboardFrame>
  );
}
