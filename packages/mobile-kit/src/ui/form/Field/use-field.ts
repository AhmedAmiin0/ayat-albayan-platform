import { useState } from 'react';
import { t } from '../../../lib/i18n/i18n';
import type { FieldInput, FieldProps } from './Field.types';
import { nativeInputOn } from './field-input.registry';

/**
 * @expo/ui's input has no React Native selection event, and a SwiftUI SecureField in its own host
 * loses the username/password pairing that password managers rely on: those stay on React Native.
 */
const needsReactNative = (input: FieldInput) =>
  input.secureTextEntry === true || input.onSelectionChange !== undefined;

const usesNativeInput = (input: FieldInput) => nativeInputOn() && !needsReactNative(input);

export function useField({ label, ltr = false, required = false, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const requiredHint = required ? t.common.required : undefined;
  return {
    title: required ? `${label} *` : label,
    native: usesNativeInput(input),
    inputProps: {
      label,
      hint: input.accessibilityHint ?? requiredHint,
      ltr,
      focused,
      onFocusChange: setFocused,
      input,
    },
  };
}
