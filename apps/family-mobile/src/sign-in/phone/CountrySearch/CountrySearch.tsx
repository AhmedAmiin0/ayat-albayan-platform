import { TextInput } from 'react-native';
import { shape, t, type, useTheme } from '@ab/mobile-kit';
import type { CountrySearchProps } from './CountrySearch.types';

/** Filters by Arabic or English name or calling code. */
export function CountrySearch({ query, onQuery }: CountrySearchProps) {
  const { color } = useTheme();
  const label = t.familyApp.signIn.countrySearch;
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={color.ink3}
      value={query}
      onChangeText={onQuery}
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      style={{
        marginHorizontal: 20,
        marginBottom: 8,
        minHeight: 44,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: color.ruleInput,
        borderRadius: shape.radius.lg,
        backgroundColor: color.raised,
        color: color.ink,
        fontFamily: type.ui[400],
        fontSize: type.size.base,
      }}
    />
  );
}
