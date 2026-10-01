import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { shape, type, useTheme } from '@/theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** LTR value (email, code, URL) inside the RTL form. */
  ltr?: boolean;
}

/**
 * Label + 16pt input, 44pt tall (docs/07 §4: the iOS zoom floor and mobile touch size).
 * Edge is the 3:1 ruleInput; focus turns it a 2px lapis ring (border + outline, so nothing shifts).
 */
export function Field({ label, ltr = false, onFocus, onBlur, ...input }: FieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs, true),
          color: color.ink2,
        }}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.ink3}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          minHeight: shape.control.touch,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: focused ? color.lapis : color.ruleInput,
          outlineWidth: focused ? 1 : 0,
          outlineColor: color.lapis,
          borderRadius: shape.radius.md,
          backgroundColor: color.raised,
          color: color.ink,
          fontFamily: type.ui[400],
          fontSize: type.size.base,
          writingDirection: ltr ? 'ltr' : 'auto',
        }}
        {...input}
      />
    </View>
  );
}
