import { View } from 'react-native';
import { AppText, Mark, t, type, useTheme, Wordmark } from '@ab/mobile-kit';

const TILE = 76;
/** The emblem inside the tile (canvas LoginFamily: 59 of 76). */
const MARK = 59;

/**
 * The top of the family sign-in (docs/50 §5 «Hierarchy»): the staff mushaf mark, unchanged, on the
 * family's deep-green tile (canvas LoginFamily), the wordmark «Ayat Al-Bayan» over «آيات البيان»,
 * and one line of welcome.
 */
export function SignInLockup() {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <View
        testID="family-tile"
        style={{
          width: TILE,
          height: TILE,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          // The deep brand green in both themes (canvas LogoGreen).
          backgroundColor: color.brandTile,
        }}
      >
        <Mark size={MARK} />
      </View>
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
