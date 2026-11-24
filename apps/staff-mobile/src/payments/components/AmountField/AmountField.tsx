import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t, shape, type, useTheme, AppText, ErrorLine, currencyName, FormLabel } from '@ab/mobile-kit';

interface AmountFieldProps {
  /** Raw text parsed by parseAmount, which accepts Arabic digits and decimal mark. */
  value: string;
  onChange: (text: string) => void;
  /** The package's currency: payments are in it (docs/11 §7), so it is shown, not asked. */
  currency: string;
  error?: string;
  label?: string;
}

/** 16pt avoids iOS zoom (docs/07 §12); numeric pad with LTR digits. */
export function AmountField({ value, onChange, currency, error, label = t.payments.amount }: AmountFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={13}
          style={{
            flex: 1,
            minHeight: shape.control.touch,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: error ? color.bad : focused ? color.lapis : color.ruleInput,
            outlineWidth: focused ? 1 : 0,
            outlineColor: color.lapis,
            borderRadius: shape.radius.md,
            backgroundColor: color.raised,
            color: color.ink,
            fontFamily: type.ui[600],
            fontSize: type.size.base,
            fontVariant: ['tabular-nums'],
            // Digits read LTR in both languages: Yoga direction, so the caret and textAlign follow it.
            direction: 'ltr',
            textAlign: 'left',
          }}
        />
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink2 }}>
          {currencyName(currency)}
        </AppText>
      </View>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
