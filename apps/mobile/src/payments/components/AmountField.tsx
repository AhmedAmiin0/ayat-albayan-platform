import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { currencyName } from '../format';
import { FormLabel } from '../FormLabel';

interface AmountFieldProps {
  /** Raw text; parseAmount reads it (Arabic digits and «٫» too). */
  value: string;
  onChange: (text: string) => void;
  /** The package's currency: payments are in it (docs/11 §7), so it is shown, not asked. */
  currency: string;
  error?: string;
  /** Defaults to «المبلغ». */
  label?: string;
}

/** «المبلغ»: 16pt (docs/07 §12, no iOS zoom), the numeric pad, LTR digits, the currency beside it. */
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
