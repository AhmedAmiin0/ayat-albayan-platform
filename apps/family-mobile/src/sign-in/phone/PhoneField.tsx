import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText, shape, t, type, useTheme } from '@ab/mobile-kit';
import type { Country } from './countries';
import { CountryButton } from './CountryButton';
import type { PhoneState } from './phone-check';

interface PhoneFieldProps {
  country: Country;
  typed: string;
  onTyped: (typed: string) => void;
  /** Opens «اختر الدولة». */
  onCountry: () => void;
  state: PhoneState;
  /** «أرسل الرمز» from the keyboard. */
  onSubmit: () => void;
}

/**
 * «رقم الواتساب» (docs/50 §4): the country (flag + calling code, a button) and the national
 * number in one LTR field, 18 pt (no iOS zoom), the phone pad and the OS's phone autofill. The
 * edge turns green on focus and red once the number cannot be right (checked while typing).
 */
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
