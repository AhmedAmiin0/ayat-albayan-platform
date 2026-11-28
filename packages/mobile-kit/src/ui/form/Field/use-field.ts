import { useState } from 'react';
import { t } from '../../../lib/i18n/i18n';
import type { FieldInput, FieldProps } from './Field.types';
import { nativeInputOn } from './field-input.registry';
import { nativeHonours } from './native-props';

const usesNativeInput = (input: FieldInput) => nativeInputOn() && nativeHonours(input);

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
