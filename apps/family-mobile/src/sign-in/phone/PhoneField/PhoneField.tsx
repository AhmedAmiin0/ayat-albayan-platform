import { TextInput, View } from 'react-native';
import { AppText, shape, t, type, useTheme } from '@ab/mobile-kit';
import { CountryButton } from '@/sign-in/phone/CountryButton';
import type { PhoneFieldProps } from './PhoneField.types';
import { usePhoneField } from './use-phone-field';

/** docs/50 §4: one LTR field at 18 pt avoids iOS zoom; validated while typing. */
export function PhoneField({ country, typed, onTyped, onCountry, ...p }: PhoneFieldProps) {
  const { color } = useTheme();
  const { focused, setFocused, edge } = usePhoneField({ state: p.state });
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
