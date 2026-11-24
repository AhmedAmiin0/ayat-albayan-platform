import { ScrollView } from 'react-native';
import { signOutDevice, t, type, useTheme, AppText, Button, KeyboardFrame } from '@ab/mobile-kit';
import { SetupFields } from './SetupFields';

const S = t.teacherAuth.setup;

/** docs/46 A4, A8: shown instead of the tabs while her login is the one a WhatsApp code made. */
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
