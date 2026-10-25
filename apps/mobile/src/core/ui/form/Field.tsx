import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '../primitives/AppText';
import { PasswordToggle } from './PasswordToggle';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** LTR value (email, code, URL) inside the RTL form. */
  ltr?: boolean;
  /** A required question of the Google Form: «*» after the label, announced as required. */
  required?: boolean;
}

/**
 * Label + 16pt input, 44pt tall (docs/07 §4: the iOS zoom floor and mobile touch size).
 * Edge is the 3:1 ruleInput; focus turns it a 2px lapis ring (border + outline, so nothing shifts).
 * Label and value start at the inline-start (AppText / textAlign 'left' = start in both directions).
 * A `secureTextEntry` field gets the eye toggle at the inline-end (PasswordToggle).
 */
export function Field({ label, ltr = false, required = false, onFocus, onBlur, ...input }: FieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const secure = input.secureTextEntry === true;
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs, true),
          color: color.ink2,
        }}
      >
        {required ? `${label} *` : label}
      </AppText>
      <View>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={required ? t.common.required : undefined}
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
            paddingEnd: secure ? shape.control.touch : 12,
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
            textAlign: 'left', // = start (RN swaps it in RTL): an LTR email sits under its label
          }}
          {...input}
          secureTextEntry={secure && !shown}
        />
        {secure ? <PasswordToggle shown={shown} onToggle={() => setShown((s) => !s)} /> : null}
      </View>
    </View>
  );
}
