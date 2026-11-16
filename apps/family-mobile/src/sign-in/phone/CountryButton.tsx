import { Pressable } from 'react-native';
import { AppText, Ltr, t, type, useTheme } from '@ab/mobile-kit';
import type { Country } from './countries';

/** The number field's start: the country's flag and calling code; a tap opens «اختر الدولة». */
export function CountryButton({ country, onPress }: { country: Country; onPress: () => void }) {
  const { color } = useTheme();
  const name = t.familyApp.signIn.countries[country.code];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.familyApp.signIn.country.replace('{name}', name)}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        borderEndWidth: 1,
        borderEndColor: color.rule,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <AppText style={{ fontSize: 20 }}>{country.flag}</AppText>
      {/* An LTR island: bare, an Arabic (RTL) line on Android prints «966+». */}
      <Ltr style={{ fontSize: type.size.base, color: color.ink }}>{country.dial}</Ltr>
    </Pressable>
  );
}
