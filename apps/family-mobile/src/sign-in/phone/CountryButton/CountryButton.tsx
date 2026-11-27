import { Pressable } from 'react-native';
import { AppText, locale, Ltr, t, type, useTheme } from '@ab/mobile-kit';
import { nameOf } from '@ab/client-core';
import { buttonStyle } from './country-button.helpers';
import type { CountryButtonProps } from './CountryButton.types';

export function CountryButton({ country, onPress }: CountryButtonProps) {
  const { color } = useTheme();
  const name = nameOf(country, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.familyApp.signIn.country.replace('{name}', name)}
      onPress={onPress}
      style={buttonStyle(color.rule, color.sunk)}
    >
      <AppText style={{ fontSize: 20 }}>{country.flag}</AppText>
      {/* An LTR island: bare, an Arabic (RTL) line on Android prints «966+». */}
      <Ltr style={{ fontSize: type.size.base, color: color.ink }}>{country.dial}</Ltr>
    </Pressable>
  );
}
