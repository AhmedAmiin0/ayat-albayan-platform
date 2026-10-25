import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

export interface DiscountFieldProps {
  /** The raw text; the selection parses it (parseDiscount) when it asks for a quote. */
  value: string;
  onChange: (text: string) => void;
}

/** The site's free discount field beside the pills: any 0–100, decimals allowed. */
export function DiscountField({ value, onChange }: DiscountFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        accessibilityLabel={t.pricing.steps.discount}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={6}
        style={{
          width: 88,
          minHeight: shape.control.touch,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: focused ? color.lapis : color.ruleInput,
          borderRadius: shape.radius.md,
          backgroundColor: color.raised,
          color: color.ink,
          fontFamily: type.ui[600],
          fontSize: type.size.base,
          fontVariant: ['tabular-nums'],
          writingDirection: 'ltr',
          textAlign: 'center',
        }}
      />
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink2 }}>
        %
      </AppText>
    </View>
  );
}
