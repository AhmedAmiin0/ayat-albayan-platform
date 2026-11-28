import { useState } from 'react';
import { shape, type, useTheme } from '../../../../theme';
import { fieldPad } from '../field-box';
import type { FieldInputProps } from '../Field.types';

export function useRnFieldInput(props: FieldInputProps) {
  const { label, hint, ltr, focused, onFocusChange, input } = props;
  const { color } = useTheme();
  const [shown, setShown] = useState(false);
  const secure = input.secureTextEntry === true;
  return {
    label,
    hint,
    input,
    island: ltr || secure ? { direction: 'ltr' as const } : undefined,
    color,
    secure,
    shown,
    toggle: () => setShown((s) => !s),
    onFocus: () => {
      onFocusChange(true);
      input.onFocus?.();
    },
    onBlur: () => {
      onFocusChange(false);
      input.onBlur?.();
    },
    style: {
      minHeight: shape.control.touch,
      paddingHorizontal: fieldPad.x,
      paddingEnd: secure ? shape.control.touch : fieldPad.x,
      paddingVertical: fieldPad.y,
      borderWidth: 1,
      borderColor: focused ? color.lapis : color.ruleInput,
      outlineWidth: focused ? 1 : 0,
      outlineColor: color.lapis,
      borderRadius: shape.radius.md,
      backgroundColor: color.raised,
      color: color.ink,
      fontFamily: type.ui[400],
      fontSize: type.size.base,
    },
  };
}
