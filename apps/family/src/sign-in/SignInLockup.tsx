import { Image, View } from 'react-native';
import { AppText, t, type, useTheme, Wordmark } from '@ab/mobile-kit';
import icon from '../../assets/icon.png';

const TILE = 76;

/**
 * The top of the family sign-in (docs/50 §5 «Hierarchy»): the family mark on its deep-green tile,
 * the wordmark «Ayat Al-Bayan» over «آيات البيان», and one line of welcome. Not the staff emblem.
 */
export function SignInLockup() {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <Image
        source={icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: TILE, height: TILE, borderRadius: TILE * 0.23 }}
      />
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
