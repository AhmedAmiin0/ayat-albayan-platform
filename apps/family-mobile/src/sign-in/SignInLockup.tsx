import { View } from 'react-native';
import { AppText, Mark, t, type, useTheme, Wordmark } from '@ab/mobile-kit';

/**
 * The top of the family sign-in (docs/50 §5 «Hierarchy»): the academy emblem, the same logo as
 * ayatalbayan.com (owner 2026-11-16 «use the logo from the project»), the wordmark «Ayat Al-Bayan»
 * over «آيات البيان», and one line of welcome.
 */
export function SignInLockup() {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <Mark size={88} />
      <Wordmark
        title={t.familyApp.signIn.wordmark}
        subtitle={t.familyApp.signIn.wordmarkArabic}
        color={color.ink}
      />
      <AppText
        style={{
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink2,
          textAlign: 'center',
        }}
      >
        {t.familyApp.signIn.welcome}
      </AppText>
    </View>
  );
}
