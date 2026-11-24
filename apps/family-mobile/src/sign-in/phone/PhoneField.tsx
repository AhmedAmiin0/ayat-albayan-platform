import type { Country, PhoneState } from '@ab/client-core';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText, shape, t, type, useTheme } from '@ab/mobile-kit';
import { CountryButton } from './CountryButton';

interface PhoneFieldProps {
  country: Country;
  typed: string;
  onTyped: (typed: string) => void;
  onCountry: () => void;
  state: PhoneState;
  onSubmit: () => void;
}

/** docs/50 §4: one LTR field at 18 pt avoids iOS zoom; validated while typing. */
export function PhoneField({ country, typed, onTyped, onCountry, ...p }: PhoneFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const ring = focused ? color.lapis : color.ruleInput;
  const edge = p.state === 'bad' ? color.bad : ring;
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
        {t.familyAuth.phone}
      </AppText>
      <View
        style={{
          direction: 'ltr',
          flexDirection: 'row',
          minHeight: 52,
          borderWidth: focused ? 2 : 1,
          borderColor: edge,
          borderRadius: shape.radius.lg,
          backgroundColor: color.raised,
          overflow: 'hidden',
        }}
      >
        <CountryButton country={country} onPress={onCountry} />
        <TextInput
          accessibilityLabel={t.familyAuth.phone}
          value={typed}
          onChangeText={onTyped}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={p.onSubmit}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="send"
          style={{
            flex: 1,
            paddingHorizontal: 12,
            color: color.ink,
            fontSize: type.size.lg,
            fontVariant: ['tabular-nums'],
            textAlign: 'left',
          }}
        />
      </View>
    </View>
  );
}
