import { Pressable, View } from 'react-native';
import { AppText, locale, Ltr, type, useTheme } from '@ab/mobile-kit';
import { type Country, nameOf } from '@ab/client-core';

interface CountryRowProps {
  country: Country;
  picked: boolean;
  onPick: (country: Country) => void;
}

/** One country in the picker: flag, name, calling code; the picked one ticked and announced. */
export function CountryRow({ country, picked, onPick }: CountryRowProps) {
  const { color } = useTheme();
  const name = nameOf(country, locale);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: picked }}
      accessibilityLabel={`${name} ${country.dial}`}
      onPress={() => onPick(country)}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <AppText style={{ fontSize: 22, lineHeight: 30 }}>{country.flag}</AppText>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.base, color: color.ink }}>
          {name}
        </AppText>
      </View>
      <Ltr style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink3 }}>
        {country.dial}
      </Ltr>
      <AppText style={{ width: 20, color: color.lapis, fontSize: type.size.base }}>
        {picked ? '✓' : ''}
      </AppText>
    </Pressable>
  );
}
